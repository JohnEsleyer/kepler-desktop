package services

import (
	"archive/zip"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/wailsapp/wails/v3/pkg/application"
)

type VaultService struct {
	app             *application.App
	activePath      string
	savedWorkspaces []string
	configDir       string
	mu              sync.RWMutex
}

func NewVaultService() *VaultService {
	vs := &VaultService{
		savedWorkspaces: make([]string, 0),
	}
	vs.initDefaultVault()
	return vs
}

func (s *VaultService) SetApp(app *application.App) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.app = app
}

func (s *VaultService) GetActiveVault() string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.activePath
}

func samePath(a, b string) bool {
	cleanA := filepath.Clean(strings.TrimSpace(a))
	cleanB := filepath.Clean(strings.TrimSpace(b))
	if cleanA == cleanB {
		return true
	}
	return strings.EqualFold(cleanA, cleanB)
}

func (s *VaultService) initDefaultVault() {
	configDir, err := os.UserConfigDir()
	if err != nil {
		configDir = os.TempDir()
	}
	s.configDir = filepath.Join(configDir, "Kepler")
	_ = os.MkdirAll(s.configDir, 0755)

	oldWsFile := filepath.Join(configDir, "EsperApp", "workspaces.json")
	newWsFile := filepath.Join(s.configDir, "workspaces.json")
	if _, err := os.Stat(newWsFile); os.IsNotExist(err) {
		if data, err := os.ReadFile(oldWsFile); err == nil {
			_ = os.WriteFile(newWsFile, data, 0644)
		}
	}

	s.loadWorkspacesList()

	if s.activePath == "" && len(s.savedWorkspaces) > 0 {
		s.activePath = s.savedWorkspaces[0]
	}

	// Auto-migrate legacy covers (cover.png -> book.cover) in the default
	// ~/Documents/001-Kepler data root if it exists.
	go s.migrateLegacyWorkspaceCovers()
}

func (s *VaultService) migrateLegacyWorkspaceCovers() {
	home, err := os.UserHomeDir()
	if err != nil {
		return
	}
	targetDir := filepath.Join(home, "Documents", "001-Kepler")
	if info, err := os.Stat(targetDir); err == nil && info.IsDir() {
		s.migrateCoversInDir(targetDir)
	}
}

// migrateCoversInDir walks a directory tree and migrates every notebook folder
// found (a directory containing book.json) from legacy cover files to the
// canonical book.cover file. Workspaces may nest books one or more levels deep.
func (s *VaultService) migrateCoversInDir(dir string) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return
	}
	for _, entry := range entries {
		if !entry.IsDir() || strings.HasPrefix(entry.Name(), ".") {
			continue
		}
		child := filepath.Join(dir, entry.Name())
		if _, err := os.Stat(filepath.Join(child, "book.json")); err == nil {
			s.migrateBookCovers(child)
		} else {
			s.migrateCoversInDir(child)
		}
	}
}

func (s *VaultService) migrateBookCovers(bookDir string) {
	legacyCovers := []string{"cover.png", "cover.jpg", "cover.jpeg", "cover.webp", "cover.gif"}
	newPath := filepath.Join(bookDir, "book.cover")
	migrated := false
	for _, legacy := range legacyCovers {
		oldPath := filepath.Join(bookDir, legacy)
		if _, err := os.Stat(oldPath); err == nil {
			if _, err := os.Stat(newPath); os.IsNotExist(err) {
				_ = os.Rename(oldPath, newPath)
			} else {
				_ = os.Remove(oldPath)
			}
			migrated = true
		}
	}
	if !migrated {
		return
	}
	metaPath := filepath.Join(bookDir, "book.json")
	data, err := os.ReadFile(metaPath)
	if err != nil {
		return
	}
	var meta BookMeta
	if err := json.Unmarshal(data, &meta); err == nil {
		coverName := "book.cover"
		meta.CoverImage = &coverName
		updated, _ := json.MarshalIndent(meta, "", "  ")
		_ = os.WriteFile(metaPath, updated, 0644)
	}
}

// sniffImageMime detects the image MIME type from magic bytes so extensionless
// book.cover files render with the correct data URI type.
func sniffImageMime(b []byte) string {
	switch {
	case len(b) >= 8 && b[0] == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G':
		return "image/png"
	case len(b) >= 3 && b[0] == 0xFF && b[1] == 0xD8 && b[2] == 0xFF:
		return "image/jpeg"
	case len(b) >= 12 && string(b[8:12]) == "WEBP":
		return "image/webp"
	case len(b) >= 6 && string(b[0:3]) == "GIF":
		return "image/gif"
	case len(b) >= 4 && string(b[0:4]) == "<svg":
		return "image/svg+xml"
	default:
		return "image/png"
	}
}

type workspacesConfig struct {
	Active     string   `json:"active"`
	Workspaces []string `json:"workspaces"`
}

func (s *VaultService) loadWorkspacesList() {
	wsFile := filepath.Join(s.configDir, "workspaces.json")
	data, err := os.ReadFile(wsFile)
	if err != nil {
		return
	}

	var cfg workspacesConfig
	if err := json.Unmarshal(data, &cfg); err == nil && len(cfg.Workspaces) > 0 {
		seen := make(map[string]bool)
		for _, ws := range cfg.Workspaces {
			clean := filepath.Clean(strings.TrimSpace(ws))
			if clean == "" || clean == "." || seen[clean] || strings.Contains(clean, "EsperVault") {
				continue
			}
			seen[clean] = true
			s.savedWorkspaces = append(s.savedWorkspaces, clean)
		}
		if cfg.Active != "" {
			cleanActive := filepath.Clean(strings.TrimSpace(cfg.Active))
			if _, statErr := os.Stat(cleanActive); statErr == nil {
				s.activePath = cleanActive
			}
		}
		return
	}

	var raw []string
	if err := json.Unmarshal(data, &raw); err != nil {
		return
	}

	seen := make(map[string]bool)
	for _, ws := range raw {
		clean := filepath.Clean(strings.TrimSpace(ws))
		if clean == "" || clean == "." || seen[clean] || strings.Contains(clean, "EsperVault") {
			continue
		}
		seen[clean] = true
		s.savedWorkspaces = append(s.savedWorkspaces, clean)
	}
}

func (s *VaultService) persistWorkspacesList() {
	wsFile := filepath.Join(s.configDir, "workspaces.json")
	cfg := workspacesConfig{
		Active:     s.activePath,
		Workspaces: s.savedWorkspaces,
	}
	data, _ := json.MarshalIndent(cfg, "", "  ")
	_ = os.WriteFile(wsFile, data, 0644)
}

func normalizeWorkspacePath(targetPath string) (string, error) {
	targetPath = strings.TrimSpace(targetPath)
	targetPath = strings.Trim(targetPath, `"'`)
	if targetPath == "" {
		return "", fmt.Errorf("empty workspace path")
	}

	if targetPath == "~" || strings.HasPrefix(targetPath, "~/") {
		home, err := os.UserHomeDir()
		if err == nil {
			if targetPath == "~" {
				targetPath = home
			} else {
				targetPath = filepath.Join(home, targetPath[2:])
			}
		}
	}

	abs, err := filepath.Abs(targetPath)
	if err != nil {
		return "", err
	}
	return filepath.Clean(abs), nil
}

func (s *VaultService) OpenTerminalPath(targetPath string) string {
	abs, err := normalizeWorkspacePath(targetPath)
	if err != nil {
		return s.GetActiveVault()
	}
	_ = os.MkdirAll(abs, 0755)

	s.mu.Lock()
	defer s.mu.Unlock()

	found := false
	for _, ws := range s.savedWorkspaces {
		if filepath.Clean(ws) == abs {
			found = true
			break
		}
	}
	if !found {
		s.savedWorkspaces = append([]string{abs}, s.savedWorkspaces...)
	}

	s.activePath = abs
	s.persistWorkspacesList()

	if s.app != nil {
		s.app.Event.Emit("workspace:opened", abs)
	}
	return s.activePath
}

func (s *VaultService) ChooseVaultFolder() (string, error) {
	s.mu.RLock()
	app := s.app
	s.mu.RUnlock()

	if app == nil {
		return s.GetActiveVault(), fmt.Errorf("app not initialized")
	}

	dialog := app.Dialog.OpenFile().
		SetTitle("Select Kepler Workspace Folder").
		CanChooseDirectories(true).
		CanChooseFiles(false)

	dir, err := dialog.PromptForSingleSelection()
	if err != nil || dir == "" {
		return s.GetActiveVault(), err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	dir = filepath.Clean(dir)
	found := false
	for _, ws := range s.savedWorkspaces {
		if samePath(ws, dir) {
			found = true
			break
		}
	}
	// Opening an already-registered workspace must never create a duplicate
	// sidebar entry - just switch to it instead.
	if !found {
		s.savedWorkspaces = append([]string{dir}, s.savedWorkspaces...)
	}
	s.activePath = dir
	s.persistWorkspacesList()
	return dir, nil
}

// DeleteWorkspace permanently removes a workspace directory from disk and
// prunes it from the saved workspaces list.
func (s *VaultService) DeleteWorkspace(dir string) (*VaultScanResult, error) {
	cleanTarget := filepath.Clean(dir)

	if err := os.RemoveAll(cleanTarget); err != nil {
		return nil, fmt.Errorf("failed to delete workspace directory: %w", err)
	}

	s.mu.Lock()
	filtered := make([]string, 0, len(s.savedWorkspaces))
	for _, ws := range s.savedWorkspaces {
		if !samePath(ws, cleanTarget) {
			filtered = append(filtered, ws)
		}
	}
	s.savedWorkspaces = filtered

	if samePath(s.activePath, cleanTarget) {
		if len(s.savedWorkspaces) > 0 {
			s.activePath = s.savedWorkspaces[0]
		} else {
			s.activePath = ""
		}
	}
	s.persistWorkspacesList()
	s.mu.Unlock()

	return s.ScanVault()
}

func (s *VaultService) SwitchWorkspace(dir string) (*VaultScanResult, error) {
	clean := filepath.Clean(dir)
	if _, err := os.Stat(clean); err != nil {
		return nil, fmt.Errorf("workspace does not exist: %s", clean)
	}

	s.mu.Lock()
	s.activePath = clean
	found := false
	for _, ws := range s.savedWorkspaces {
		if samePath(ws, clean) {
			found = true
			break
		}
	}
	if !found {
		s.savedWorkspaces = append(s.savedWorkspaces, clean)
	}
	s.persistWorkspacesList()
	s.mu.Unlock()

	return s.ScanVault()
}

func (s *VaultService) CloseWorkspace(dir string) (*VaultScanResult, error) {
	s.mu.Lock()
	cleanTarget := filepath.Clean(dir)
	filtered := make([]string, 0, len(s.savedWorkspaces))
	for _, ws := range s.savedWorkspaces {
		if !samePath(ws, cleanTarget) {
			filtered = append(filtered, ws)
		}
	}
	s.savedWorkspaces = filtered

	if samePath(s.activePath, cleanTarget) {
		if len(s.savedWorkspaces) > 0 {
			s.activePath = s.savedWorkspaces[0]
		} else {
			s.activePath = ""
		}
	}
	s.persistWorkspacesList()
	s.mu.Unlock()

	return s.ScanVault()
}

func (s *VaultService) ScanVault() (*VaultScanResult, error) {
	s.mu.RLock()
	vaultRoot := s.activePath
	workspaces := append([]string{}, s.savedWorkspaces...)
	s.mu.RUnlock()

	// Validate workspaces against disk in real-time. Workspaces deleted outside
	// the app disappear from the list immediately on the next scan.
	validWorkspaces := make([]string, 0, len(workspaces))
	wsEntries := make([]WorkspaceEntry, 0, len(workspaces))
	for _, ws := range workspaces {
		clean := filepath.Clean(ws)
		info, err := os.Stat(clean)
		if err != nil || !info.IsDir() {
			continue
		}
		validWorkspaces = append(validWorkspaces, clean)
		count := 0
		if subDirs, e := os.ReadDir(clean); e == nil {
			for _, sub := range subDirs {
				if sub.IsDir() && !strings.HasPrefix(sub.Name(), ".") {
					count++
				}
			}
		}
		wsEntries = append(wsEntries, WorkspaceEntry{
			Path:      clean,
			Name:      filepath.Base(clean),
			BookCount: count,
		})
	}

	// If any workspace vanished, persist the pruned list and shift the active
	// workspace to the next available one.
	s.mu.Lock()
	if len(validWorkspaces) != len(s.savedWorkspaces) {
		s.savedWorkspaces = validWorkspaces
		if _, err := os.Stat(s.activePath); err != nil {
			if len(s.savedWorkspaces) > 0 {
				s.activePath = s.savedWorkspaces[0]
			} else {
				s.activePath = ""
			}
			vaultRoot = s.activePath
		}
		s.persistWorkspacesList()
	}
	s.mu.Unlock()

	if vaultRoot == "" {
		return &VaultScanResult{
			VaultPath:       "",
			Books:           []Book{},
			Tags:            []string{},
			Workspaces:      wsEntries,
			ActiveWorkspace: "",
		}, nil
	}

	dirEntries, err := os.ReadDir(vaultRoot)
	if err != nil {
		return &VaultScanResult{
			VaultPath:       vaultRoot,
			Books:           []Book{},
			Tags:            []string{},
			Workspaces:      wsEntries,
			ActiveWorkspace: vaultRoot,
		}, nil
	}

	books := []Book{}
	allTags := make(map[string]bool)

	for _, d := range dirEntries {
		if !d.IsDir() || strings.HasPrefix(d.Name(), ".") {
			continue
		}

		bookDir := filepath.Join(vaultRoot, d.Name())
		metaFile := filepath.Join(bookDir, "book.json")

		var meta BookMeta
		rawMeta, err := os.ReadFile(metaFile)
		if err == nil {
			_ = json.Unmarshal(rawMeta, &meta)
		}

		if meta.ID == "" {
			meta.ID = "book-" + randomHex(4)
		}
		if meta.Title == "" {
			meta.Title = d.Name()
		}
		if meta.CoverPreset == "" {
			meta.CoverPreset = "celestial"
		}
		if len(meta.Tags) == 0 {
			meta.Tags = []string{"General"}
		}
		for _, t := range meta.Tags {
			allTags[t] = true
		}

		if err != nil {
			meta.ShowTitleOnCover = true
			meta.CreatedAt = time.Now().UnixMilli()
			meta.UpdatedAt = time.Now().UnixMilli()
			updated, _ := json.MarshalIndent(meta, "", "  ")
			_ = os.WriteFile(metaFile, updated, 0644)
		}

		// Check for book.cover (or any legacy cover filename) and convert to a
		// Data URI using magic-byte sniffing, since book.cover is extensionless.
		coverFileCandidates := []string{"book.cover"}
		if meta.CoverImage != nil && *meta.CoverImage != "" && !strings.HasPrefix(*meta.CoverImage, "data:") {
			coverFileCandidates = append([]string{*meta.CoverImage}, coverFileCandidates...)
		}
		coverFound := false
		for _, cfn := range coverFileCandidates {
			coverFilePath := filepath.Join(bookDir, cfn)
			if bData, readErr := os.ReadFile(coverFilePath); readErr == nil {
				dataUri := fmt.Sprintf("data:%s;base64,%s", sniffImageMime(bData), base64.StdEncoding.EncodeToString(bData))
				meta.CoverImage = &dataUri
				coverFound = true
				break
			}
		}
		if !coverFound {
			meta.CoverImage = nil
		}

		chaptersDir := filepath.Join(bookDir, "chapters")
		subpagesDir := filepath.Join(bookDir, "subpages")
		visualsDir := filepath.Join(bookDir, "visuals")
		_ = os.MkdirAll(chaptersDir, 0755)
		_ = os.MkdirAll(subpagesDir, 0755)
		_ = os.MkdirAll(visualsDir, 0755)

		chEntries, _ := os.ReadDir(chaptersDir)
		chSourceDir := chaptersDir
		if len(chEntries) == 0 {
			rootMd, _ := os.ReadDir(bookDir)
			hasRootMd := false
			for _, r := range rootMd {
				if !r.IsDir() && strings.HasSuffix(strings.ToLower(r.Name()), ".md") {
					hasRootMd = true
					break
				}
			}
			if hasRootMd {
				chSourceDir = bookDir
				chEntries = rootMd
			}
		}

		mdNames := []string{}
		for _, f := range chEntries {
			if !f.IsDir() && strings.HasSuffix(strings.ToLower(f.Name()), ".md") {
				mdNames = append(mdNames, f.Name())
			}
		}
		sort.Slice(mdNames, func(i, j int) bool {
			return naturalLess(mdNames[i], mdNames[j])
		})

		chapters := []Chapter{}
		for idx, fn := range mdNames {
			content, _ := os.ReadFile(filepath.Join(chSourceDir, fn))
			strContent := string(content)
			idPart := strings.TrimSuffix(fn, ".md")
			chapters = append(chapters, Chapter{
				ID:       fmt.Sprintf("ch-%s-%s", meta.ID, idPart),
				BookID:   meta.ID,
				FileName: fn,
				Title:    extractTitle(strContent, fn, idx),
				Content:  strContent,
				Position: idx,
			})
		}

		subpages := []Subpage{}
		spEntries, _ := os.ReadDir(subpagesDir)
		for _, sf := range spEntries {
			if !sf.IsDir() && strings.HasSuffix(strings.ToLower(sf.Name()), ".md") {
				content, _ := os.ReadFile(filepath.Join(subpagesDir, sf.Name()))
				strContent := string(content)
				spID := strings.TrimSuffix(sf.Name(), ".md")
				subpages = append(subpages, Subpage{
					ID:       spID,
					BookID:   filepath.Base(bookDir),
					FileName: sf.Name(),
					Title:    extractTitle(strContent, sf.Name(), 0),
					Content:  strContent,
				})
			}
		}

		questions := []Question{}
		rawQ, err := os.ReadFile(filepath.Join(bookDir, "questions.json"))
		if err == nil {
			_ = json.Unmarshal(rawQ, &questions)
		}

		visuals := []Visual{}
		visEntries, _ := os.ReadDir(visualsDir)
		for _, vf := range visEntries {
			if vf.IsDir() {
				continue
			}
			lower := strings.ToLower(vf.Name())
			kind := "html"
			if strings.HasSuffix(lower, ".json") {
				kind = "json"
			}
			content, _ := os.ReadFile(filepath.Join(visualsDir, vf.Name()))
			assigned := 1
			matches := regexp.MustCompile(`^0*(\d+)`).FindStringSubmatch(vf.Name())
			if len(matches) > 1 {
				if parsed, e := strconv.Atoi(matches[1]); e == nil {
					assigned = parsed
				}
			}

			title := strings.TrimSuffix(vf.Name(), filepath.Ext(vf.Name()))
			title = regexp.MustCompile(`^[0-9._\-\s]+`).ReplaceAllString(title, "")
			if title == "" {
				title = "Simulation"
			}

			visuals = append(visuals, Visual{
				FileName:   vf.Name(),
				Title:      title,
				Kind:       kind,
				AssignedCh: assigned,
				Content:    string(content),
			})
		}

		books = append(books, Book{
			Meta:      meta,
			Path:      bookDir,
			Chapters:  chapters,
			Subpages:  subpages,
			Questions: questions,
			Visuals:   visuals,
		})
	}

	sort.SliceStable(books, func(i, j int) bool {
		return books[i].Meta.CreatedAt > books[j].Meta.CreatedAt
	})

	tagsList := make([]string, 0, len(allTags))
	for t := range allTags {
		tagsList = append(tagsList, t)
	}
	sort.Strings(tagsList)

	return &VaultScanResult{
		VaultPath:       vaultRoot,
		Books:           books,
		Tags:            tagsList,
		Workspaces:      wsEntries,
		ActiveWorkspace: vaultRoot,
	}, nil
}

func (s *VaultService) UpdateBookMeta(bookPath string, meta BookMeta) error {
	metaFile := filepath.Join(bookPath, "book.json")
	meta.UpdatedAt = time.Now().UnixMilli()

	if meta.CoverImage != nil && strings.HasPrefix(*meta.CoverImage, "data:") {
		idx := strings.Index(*meta.CoverImage, ";base64,")
		if idx != -1 {
			rawDecoded, decErr := base64.StdEncoding.DecodeString((*meta.CoverImage)[idx+8:])
			if decErr == nil {
				// Always store covers as the extensionless book.cover so the
				// Android gallery/MediaScanner never indexes notebook folders.
				coverFileName := "book.cover"
				_ = os.WriteFile(filepath.Join(bookPath, coverFileName), rawDecoded, 0644)
				meta.CoverImage = &coverFileName
			}
		}
	}

	data, err := json.MarshalIndent(meta, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(metaFile, data, 0644)
}

func (s *VaultService) CreateBook(title, description, tags, preset string, showTitleOnCover bool, coverDataUri string) (string, error) {
	s.mu.RLock()
	root := s.activePath
	s.mu.RUnlock()

	safeTitle := regexp.MustCompile(`[\\/:*?"<>|]+`).ReplaceAllString(title, "_")
	bookDir := filepath.Join(root, safeTitle)
	chaptersDir := filepath.Join(bookDir, "chapters")
	subpagesDir := filepath.Join(bookDir, "subpages")
	visualsDir := filepath.Join(bookDir, "visuals")

	_ = os.MkdirAll(chaptersDir, 0755)
	_ = os.MkdirAll(subpagesDir, 0755)
	_ = os.MkdirAll(visualsDir, 0755)

	tagList := strings.Split(tags, ",")
	for i := range tagList {
		tagList[i] = strings.TrimSpace(tagList[i])
	}

	var coverImageFile *string
	if coverDataUri != "" && strings.HasPrefix(coverDataUri, "data:") {
		idx := strings.Index(coverDataUri, ";base64,")
		if idx != -1 {
			rawDecoded, decErr := base64.StdEncoding.DecodeString(coverDataUri[idx+8:])
			if decErr == nil {
				fn := "book.cover"
				if writeErr := os.WriteFile(filepath.Join(bookDir, fn), rawDecoded, 0644); writeErr == nil {
					coverImageFile = &fn
				}
			}
		}
	}

	meta := BookMeta{
		ID:               "book-" + randomHex(4),
		Title:            title,
		Description:      description,
		CoverPreset:      preset,
		CoverImage:       coverImageFile,
		ShowTitleOnCover: showTitleOnCover,
		Tags:             tagList,
		CreatedAt:        time.Now().UnixMilli(),
		UpdatedAt:        time.Now().UnixMilli(),
	}

	data, _ := json.MarshalIndent(meta, "", "  ")
	_ = os.WriteFile(filepath.Join(bookDir, "book.json"), data, 0644)

	chID := "ch-" + randomHex(3)
	safeIntro := regexp.MustCompile(`[\\/:*?"<>| ]+`).ReplaceAllString(title, "_")
	fileName := fmt.Sprintf("01_%s_%s.md", chID, safeIntro)
	ch1 := fmt.Sprintf("# %s\n\nWelcome to your new interactive notebook.", title)
	_ = os.WriteFile(filepath.Join(chaptersDir, fileName), []byte(ch1), 0644)

	return bookDir, nil
}

func (s *VaultService) getChapterPath(bookPath, fileName string) string {
	candidate := filepath.Join(bookPath, "chapters", fileName)
	if _, err := os.Stat(candidate); err == nil {
		return candidate
	}
	rootCandidate := filepath.Join(bookPath, fileName)
	if _, err := os.Stat(rootCandidate); err == nil {
		return rootCandidate
	}
	_ = os.MkdirAll(filepath.Join(bookPath, "chapters"), 0755)
	return candidate
}

func (s *VaultService) SaveChapter(bookPath, fileName, content string) error {
	dest := s.getChapterPath(bookPath, fileName)
	return os.WriteFile(dest, []byte(content), 0644)
}

func (s *VaultService) CreateChapter(bookPath, title string) (string, error) {
	chaptersDir := filepath.Join(bookPath, "chapters")
	_ = os.MkdirAll(chaptersDir, 0755)

	entries, _ := os.ReadDir(chaptersDir)
	maxNum := 0
	for _, e := range entries {
		if strings.HasSuffix(e.Name(), ".md") {
			matches := regexp.MustCompile(`^0*(\d+)`).FindStringSubmatch(e.Name())
			if len(matches) > 1 {
				if n, err := strconv.Atoi(matches[1]); err == nil && n > maxNum {
					maxNum = n
				}
			}
		}
	}
	nextNum := maxNum + 1
	chID := "ch-" + randomHex(3)
	safeTitle := regexp.MustCompile(`[\\/:*?"<>| ]+`).ReplaceAllString(title, "_")
	fileName := fmt.Sprintf("%02d_%s_%s.md", nextNum, chID, safeTitle)
	body := fmt.Sprintf("# %s\n\nWrite your thoughts, formulas, or code snippets here...", title)

	err := os.WriteFile(filepath.Join(chaptersDir, fileName), []byte(body), 0644)
	return fileName, err
}

func (s *VaultService) DeleteChapter(bookPath, fileName string) error {
	dest := s.getChapterPath(bookPath, fileName)
	return os.Remove(dest)
}

func (s *VaultService) ReorderChapters(bookPath string, fileNames []string) error {
	chaptersDir := filepath.Join(bookPath, "chapters")
	_ = os.MkdirAll(chaptersDir, 0755)

	type renamePlan struct {
		oldPath string
		newPath string
	}
	var plans []renamePlan

	for idx, oldName := range fileNames {
		oldPath := s.getChapterPath(bookPath, oldName)
		stripped := regexp.MustCompile(`^0*\d+_?`).ReplaceAllString(oldName, "")
		newName := fmt.Sprintf("%02d_%s", idx+1, stripped)
		newPath := filepath.Join(chaptersDir, newName)
		plans = append(plans, renamePlan{oldPath: oldPath, newPath: newPath})
	}

	for i, plan := range plans {
		tempPath := plan.oldPath + fmt.Sprintf(".reorder_tmp_%d", i)
		_ = os.Rename(plan.oldPath, tempPath)
		plans[i].oldPath = tempPath
	}
	for _, plan := range plans {
		_ = os.Rename(plan.oldPath, plan.newPath)
	}

	return nil
}

func (s *VaultService) CreateSubpage(bookPath, initialTitle string) (Subpage, error) {
	subpagesDir := filepath.Join(bookPath, "subpages")
	_ = os.MkdirAll(subpagesDir, 0755)

	id := "page-" + randomHex(4)
	fileName := id + ".md"
	title := strings.TrimSpace(initialTitle)
	if title == "" {
		title = "Untitled Page"
	}
	content := fmt.Sprintf("# %s\n\n", title)
	dest := filepath.Join(subpagesDir, fileName)
	err := os.WriteFile(dest, []byte(content), 0644)
	if err != nil {
		return Subpage{}, err
	}

	return Subpage{
		ID:       id,
		BookID:   filepath.Base(bookPath),
		FileName: fileName,
		Title:    title,
		Content:  content,
	}, nil
}

func (s *VaultService) SaveSubpage(bookPath, subpageID, content string) error {
	subpagesDir := filepath.Join(bookPath, "subpages")
	_ = os.MkdirAll(subpagesDir, 0755)
	dest := filepath.Join(subpagesDir, subpageID+".md")
	return os.WriteFile(dest, []byte(content), 0644)
}

func (s *VaultService) GetSubpage(bookPath, subpageID string) (Subpage, error) {
	dest := filepath.Join(bookPath, "subpages", subpageID+".md")
	data, err := os.ReadFile(dest)
	if err != nil {
		return Subpage{}, err
	}
	strContent := string(data)
	return Subpage{
		ID:       subpageID,
		BookID:   filepath.Base(bookPath),
		FileName: subpageID + ".md",
		Title:    extractTitle(strContent, subpageID, 0),
		Content:  strContent,
	}, nil
}

func (s *VaultService) DeleteSubpage(bookPath, subpageID string) error {
	dest := filepath.Join(bookPath, "subpages", subpageID+".md")
	return os.Remove(dest)
}

type OrphanSubpageResult struct {
	BookTitle string  `json:"bookTitle"`
	BookPath  string  `json:"bookPath"`
	Subpage   Subpage `json:"subpage"`
}

func (s *VaultService) ScanWorkspaceOrphans() ([]OrphanSubpageResult, error) {
	s.mu.RLock()
	root := s.activePath
	s.mu.RUnlock()

	if root == "" {
		return []OrphanSubpageResult{}, nil
	}

	dirEntries, err := os.ReadDir(root)
	if err != nil {
		return []OrphanSubpageResult{}, err
	}

	var allOrphans []OrphanSubpageResult

	for _, d := range dirEntries {
		if !d.IsDir() || strings.HasPrefix(d.Name(), ".") {
			continue
		}
		bookPath := filepath.Join(root, d.Name())
		orphans, err := s.ScanOrphanSubpages(bookPath)
		if err == nil && len(orphans) > 0 {
			for _, o := range orphans {
				allOrphans = append(allOrphans, OrphanSubpageResult{
					BookTitle: d.Name(),
					BookPath:  bookPath,
					Subpage:   o,
				})
			}
		}
	}
	return allOrphans, nil
}

func (s *VaultService) ScanOrphanSubpages(bookPath string) ([]Subpage, error) {
	subpagesDir := filepath.Join(bookPath, "subpages")
	chaptersDir := filepath.Join(bookPath, "chapters")

	spEntries, err := os.ReadDir(subpagesDir)
	if err != nil {
		return []Subpage{}, nil
	}

	var combinedText strings.Builder
	chEntries, _ := os.ReadDir(chaptersDir)
	for _, ce := range chEntries {
		if !ce.IsDir() && strings.HasSuffix(ce.Name(), ".md") {
			bytes, _ := os.ReadFile(filepath.Join(chaptersDir, ce.Name()))
			combinedText.Write(bytes)
			combinedText.WriteString("\n")
		}
	}

	rootEntries, _ := os.ReadDir(bookPath)
	for _, re := range rootEntries {
		if !re.IsDir() && strings.HasSuffix(re.Name(), ".md") {
			bytes, _ := os.ReadFile(filepath.Join(bookPath, re.Name()))
			combinedText.Write(bytes)
			combinedText.WriteString("\n")
		}
	}

	for _, sf := range spEntries {
		if !sf.IsDir() && strings.HasSuffix(sf.Name(), ".md") {
			bytes, _ := os.ReadFile(filepath.Join(subpagesDir, sf.Name()))
			combinedText.Write(bytes)
			combinedText.WriteString("\n")
		}
	}

	allRef := combinedText.String()
	orphans := []Subpage{}
	for _, sf := range spEntries {
		if sf.IsDir() || !strings.HasSuffix(sf.Name(), ".md") {
			continue
		}
		id := strings.TrimSuffix(sf.Name(), ".md")
		targetRef := "kepler-page://" + id
		if !strings.Contains(allRef, targetRef) {
			content, _ := os.ReadFile(filepath.Join(subpagesDir, sf.Name()))
			strContent := string(content)
			orphans = append(orphans, Subpage{
				ID:       id,
				BookID:   filepath.Base(bookPath),
				FileName: sf.Name(),
				Title:    extractTitle(strContent, sf.Name(), 0),
				Content:  strContent,
			})
		}
	}
	return orphans, nil
}

func (s *VaultService) SaveQuestions(bookPath string, questionsJSON string) error {
	dest := filepath.Join(bookPath, "questions.json")
	return os.WriteFile(dest, []byte(questionsJSON), 0644)
}

func (s *VaultService) SaveVisual(bookPath, fileName, content string) error {
	visDir := filepath.Join(bookPath, "visuals")
	_ = os.MkdirAll(visDir, 0755)
	return os.WriteFile(filepath.Join(visDir, fileName), []byte(content), 0644)
}

func (s *VaultService) DeleteVisual(bookPath, fileName string) error {
	return os.Remove(filepath.Join(bookPath, "visuals", fileName))
}

func (s *VaultService) DeleteBook(bookPath string) error {
	return os.RemoveAll(bookPath)
}

func (s *VaultService) ExportVaultZip() (string, error) {
	s.mu.RLock()
	root := s.activePath
	s.mu.RUnlock()

	home, _ := os.UserHomeDir()
	outPath := filepath.Join(home, "Downloads", fmt.Sprintf("kepler-workspace-%d.zip", time.Now().Unix()))
	_ = os.MkdirAll(filepath.Dir(outPath), 0755)

	zipFile, err := os.Create(outPath)
	if err != nil {
		return "", err
	}
	defer zipFile.Close()

	w := zip.NewWriter(zipFile)
	defer w.Close()

	walker := func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return nil
		}
		rel, _ := filepath.Rel(root, path)
		f, err := w.Create(rel)
		if err != nil {
			return err
		}
		in, err := os.Open(path)
		if err != nil {
			return err
		}
		defer in.Close()
		_, err = io.Copy(f, in)
		return err
	}

	_ = filepath.Walk(root, walker)
	return outPath, nil
}

func naturalLess(a, b string) bool {
	re := regexp.MustCompile(`(\d+|\D+)`)
	aParts := re.FindAllString(a, -1)
	bParts := re.FindAllString(b, -1)
	for i := 0; i < len(aParts) && i < len(bParts); i++ {
		ap, bp := aParts[i], bParts[i]
		an, errA := strconv.ParseInt(ap, 10, 64)
		bn, errB := strconv.ParseInt(bp, 10, 64)
		if errA == nil && errB == nil {
			if an != bn {
				return an < bn
			}
		} else {
			cmp := strings.Compare(strings.ToLower(ap), strings.ToLower(bp))
			if cmp != 0 {
				return cmp < 0
			}
		}
	}
	return len(aParts) < len(bParts)
}

func cleanTitleFormatting(s string) string {
	s = strings.TrimSpace(s)
	s = regexp.MustCompile(`^#+\s*`).ReplaceAllString(s, "")
	s = regexp.MustCompile("^(\\*\\*|__|\\*|_|`)").ReplaceAllString(s, "")
	s = regexp.MustCompile("(\\*\\*|__|\\*|_|`)$").ReplaceAllString(s, "")
	s = regexp.MustCompile(`\[([^\]]+)\]\([^)]+\)`).ReplaceAllString(s, "$1")
	return strings.TrimSpace(s)
}

func extractTitle(content string, fileName string, fallbackIndex int) string {
	lines := strings.Split(content, "\n")
	for _, l := range lines {
		l = strings.TrimSpace(l)
		if l == "" || strings.HasPrefix(l, "---") {
			continue
		}
		title := cleanTitleFormatting(l)
		if title != "" {
			return title
		}
	}
	clean := strings.TrimSuffix(fileName, filepath.Ext(fileName))
	clean = regexp.MustCompile(`^[0-9._\-\s]+`).ReplaceAllString(clean, "")
	if clean == "" {
		return fmt.Sprintf("Chapter %d", fallbackIndex+1)
	}
	return strings.ReplaceAll(clean, "_", " ")
}

func randomHex(bytes int) string {
	b := make([]byte, bytes)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}
