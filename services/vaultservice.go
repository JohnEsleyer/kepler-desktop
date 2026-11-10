// File: services/vaultservice.go

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

func (s *VaultService) initDefaultVault() {
	configDir, err := os.UserConfigDir()
	if err != nil {
		configDir = os.TempDir()
	}
	s.configDir = filepath.Join(configDir, "EsperApp")
	_ = os.MkdirAll(s.configDir, 0755)

	s.loadWorkspacesList()

	defaultPath := filepath.Join(s.configDir, "EsperVault")
	_ = os.MkdirAll(defaultPath, 0755)

	if len(s.savedWorkspaces) == 0 {
		s.savedWorkspaces = append(s.savedWorkspaces, defaultPath)
		s.persistWorkspacesList()
	}

	if s.activePath == "" {
		s.activePath = s.savedWorkspaces[0]
	}

	// Seed the built-in vault only when it is completely empty.
	if entries, err := os.ReadDir(defaultPath); err == nil && len(entries) == 0 {
		s.seedDefaultBooks(defaultPath)
	}
}

func (s *VaultService) loadWorkspacesList() {
	wsFile := filepath.Join(s.configDir, "workspaces.json")
	data, err := os.ReadFile(wsFile)
	if err != nil {
		return
	}

	var raw []string
	if err := json.Unmarshal(data, &raw); err != nil {
		return
	}

	seen := make(map[string]bool)
	for _, ws := range raw {
		clean := filepath.Clean(strings.TrimSpace(ws))
		if clean == "" || clean == "." || seen[clean] {
			continue
		}
		seen[clean] = true
		s.savedWorkspaces = append(s.savedWorkspaces, clean)
	}
}

func (s *VaultService) persistWorkspacesList() {
	wsFile := filepath.Join(s.configDir, "workspaces.json")
	data, _ := json.MarshalIndent(s.savedWorkspaces, "", "  ")
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
		s.savedWorkspaces = append(s.savedWorkspaces, abs)
		s.persistWorkspacesList()
	}

	s.activePath = abs

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
		SetTitle("Select Esper Workspace Folder").
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
		if filepath.Clean(ws) == dir {
			found = true
			break
		}
	}
	if !found {
		s.savedWorkspaces = append(s.savedWorkspaces, dir)
		s.persistWorkspacesList()
	}
	s.activePath = dir
	return dir, nil
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
		if filepath.Clean(ws) == clean {
			found = true
			break
		}
	}
	if !found {
		s.savedWorkspaces = append(s.savedWorkspaces, clean)
		s.persistWorkspacesList()
	}
	s.mu.Unlock()

	return s.ScanVault()
}

func (s *VaultService) CloseWorkspace(dir string) (*VaultScanResult, error) {
	s.mu.Lock()
	cleanTarget := filepath.Clean(dir)
	filtered := make([]string, 0, len(s.savedWorkspaces))
	for _, ws := range s.savedWorkspaces {
		if filepath.Clean(ws) != cleanTarget {
			filtered = append(filtered, ws)
		}
	}
	s.savedWorkspaces = filtered
	s.persistWorkspacesList()

	if filepath.Clean(s.activePath) == cleanTarget {
		if len(s.savedWorkspaces) > 0 {
			s.activePath = s.savedWorkspaces[0]
		} else {
			defaultPath := filepath.Join(s.configDir, "EsperVault")
			_ = os.MkdirAll(defaultPath, 0755)
			s.savedWorkspaces = []string{defaultPath}
			s.activePath = defaultPath
			s.persistWorkspacesList()
		}
	}
	s.mu.Unlock()

	return s.ScanVault()
}

func (s *VaultService) ScanVault() (*VaultScanResult, error) {
	s.mu.RLock()
	vaultRoot := s.activePath
	workspaces := append([]string{}, s.savedWorkspaces...)
	s.mu.RUnlock()

	dirEntries, err := os.ReadDir(vaultRoot)
	if err != nil {
		return nil, err
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

		if meta.CoverImage != nil && *meta.CoverImage != "" && !strings.HasPrefix(*meta.CoverImage, "data:") {
			coverFilePath := filepath.Join(bookDir, *meta.CoverImage)
			if bData, readErr := os.ReadFile(coverFilePath); readErr == nil {
				mime := "image/jpeg"
				lowerName := strings.ToLower(*meta.CoverImage)
				if strings.HasSuffix(lowerName, ".png") {
					mime = "image/png"
				} else if strings.HasSuffix(lowerName, ".webp") {
					mime = "image/webp"
				} else if strings.HasSuffix(lowerName, ".gif") {
					mime = "image/gif"
				}
				dataUri := fmt.Sprintf("data:%s;base64,%s", mime, base64.StdEncoding.EncodeToString(bData))
				meta.CoverImage = &dataUri
			} else {
				meta.CoverImage = nil
			}
		}

		// Read Chapters (*.md)
		files, _ := os.ReadDir(bookDir)
		mdNames := []string{}
		for _, f := range files {
			if !f.IsDir() && strings.HasSuffix(strings.ToLower(f.Name()), ".md") {
				mdNames = append(mdNames, f.Name())
			}
		}
		sort.Slice(mdNames, func(i, j int) bool {
			return naturalLess(mdNames[i], mdNames[j])
		})

		chapters := []Chapter{}
		for idx, fn := range mdNames {
			content, _ := os.ReadFile(filepath.Join(bookDir, fn))
			strContent := string(content)
			chapters = append(chapters, Chapter{
				ID:       fmt.Sprintf("p-%s-%s", meta.ID, fn),
				BookID:   meta.ID,
				FileName: fn,
				Title:    extractTitle(strContent, fn, idx),
				Content:  strContent,
				Position: idx,
			})
		}

		questions := []Question{}
		rawQ, err := os.ReadFile(filepath.Join(bookDir, "questions.json"))
		if err == nil {
			_ = json.Unmarshal(rawQ, &questions)
		}

		visuals := []Visual{}
		visEntries, _ := os.ReadDir(filepath.Join(bookDir, "visuals"))
		for _, vf := range visEntries {
			if vf.IsDir() {
				continue
			}
			lower := strings.ToLower(vf.Name())
			kind := "html"
			if strings.HasSuffix(lower, ".json") {
				kind = "json"
			}
			content, _ := os.ReadFile(filepath.Join(bookDir, "visuals", vf.Name()))
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
			Questions: questions,
			Visuals:   visuals,
		})
	}

	// Sort notebooks by latest created to oldest
	sort.SliceStable(books, func(i, j int) bool {
		return books[i].Meta.CreatedAt > books[j].Meta.CreatedAt
	})

	tagsList := make([]string, 0, len(allTags))
	for t := range allTags {
		tagsList = append(tagsList, t)
	}
	sort.Strings(tagsList)

	wsEntries := make([]WorkspaceEntry, 0, len(workspaces))
	for _, ws := range workspaces {
		count := 0
		if subDirs, e := os.ReadDir(ws); e == nil {
			for _, sub := range subDirs {
				if sub.IsDir() && !strings.HasPrefix(sub.Name(), ".") {
					count++
				}
			}
		}
		wsEntries = append(wsEntries, WorkspaceEntry{
			Path:      ws,
			Name:      filepath.Base(ws),
			BookCount: count,
		})
	}

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
			mimeHeader := (*meta.CoverImage)[:idx]
			ext := ".jpg"
			if strings.Contains(mimeHeader, "png") {
				ext = ".png"
			} else if strings.Contains(mimeHeader, "webp") {
				ext = ".webp"
			} else if strings.Contains(mimeHeader, "gif") {
				ext = ".gif"
			}
			rawDecoded, decErr := base64.StdEncoding.DecodeString((*meta.CoverImage)[idx+8:])
			if decErr == nil {
				coverFileName := "cover" + ext
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
	_ = os.MkdirAll(filepath.Join(bookDir, "visuals"), 0755)

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
				fn := "cover.jpg"
				mimeHeader := coverDataUri[:idx]
				if strings.Contains(mimeHeader, "png") {
					fn = "cover.png"
				} else if strings.Contains(mimeHeader, "webp") {
					fn = "cover.webp"
				} else if strings.Contains(mimeHeader, "gif") {
					fn = "cover.gif"
				}
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

	ch1 := fmt.Sprintf("# %s\n\nWelcome to your new interactive notebook.", title)
	_ = os.WriteFile(filepath.Join(bookDir, "01_Introduction.md"), []byte(ch1), 0644)

	return bookDir, nil
}

func (s *VaultService) SaveChapter(bookPath, fileName, content string) error {
	dest := filepath.Join(bookPath, fileName)
	return os.WriteFile(dest, []byte(content), 0644)
}

func (s *VaultService) CreateChapter(bookPath, title string) (string, error) {
	entries, _ := os.ReadDir(bookPath)
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
	safeTitle := regexp.MustCompile(`[\\/:*?"<>| ]+`).ReplaceAllString(title, "_")
	fileName := fmt.Sprintf("%02d_%s.md", nextNum, safeTitle)
	body := fmt.Sprintf("# %s\n\nWrite your thoughts, formulas, or code snippets here...", title)

	err := os.WriteFile(filepath.Join(bookPath, fileName), []byte(body), 0644)
	return fileName, err
}

func (s *VaultService) DeleteChapter(bookPath, fileName string) error {
	return os.Remove(filepath.Join(bookPath, fileName))
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
	outPath := filepath.Join(home, "Downloads", fmt.Sprintf("esper-vault-%d.zip", time.Now().Unix()))
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

func (s *VaultService) seedDefaultBooks(root string) {
	bookDir := filepath.Join(root, "Astrodynamics & Keplerian Orbits")
	_ = os.MkdirAll(filepath.Join(bookDir, "visuals"), 0755)

	meta := BookMeta{
		ID:               "book-astrodynamics",
		Title:            "Astrodynamics & Keplerian Orbits",
		Description:      "Interactive celestial mechanics, vis-viva equations, and orbital transfers.",
		CoverPreset:      "solar",
		ShowTitleOnCover: true,
		Tags:             []string{"Physics", "Astrodynamics", "Space"},
		CreatedAt:        time.Now().UnixMilli(),
		UpdatedAt:        time.Now().UnixMilli(),
	}
	rawMeta, _ := json.MarshalIndent(meta, "", "  ")
	_ = os.WriteFile(filepath.Join(bookDir, "book.json"), rawMeta, 0644)

	ch1 := `# Keplerian Motion

Planetary motion obeys Kepler's three laws:

1. The orbit of a planet is an ellipse with the Sun at one of the two foci.
2. Equal areas are swept out during equal intervals:
$$\frac{dA}{dt} = \frac{1}{2} r^2 \dot{\theta} = \text{const}$$
3. Harmonic relation:
$$\frac{T^2}{a^3} = \frac{4\pi^2}{G(M + m)}$$`
	_ = os.WriteFile(filepath.Join(bookDir, "01_Keplerian_Motion.md"), []byte(ch1), 0644)

	simHtml := `<!doctype html><html><body style="margin:0;background:#030712;display:flex;align-items:center;justify-content:center;height:100vh;"><canvas id="c" width="400" height="400" style="background:#0b0f19;border-radius:12px;border:1px solid #1e293b;"></canvas><script>const c=document.getElementById('c'),ctx=c.getContext('2d');let t=0;function r(){ctx.clearRect(0,0,400,400);ctx.strokeStyle='#334155';ctx.beginPath();ctx.ellipse(200,200,130,85,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#f59e0b';ctx.beginPath();ctx.arc(250,200,9,0,Math.PI*2);ctx.fill();ctx.fillStyle='#38bdf8';ctx.beginPath();ctx.arc(200+130*Math.cos(t),200+85*Math.sin(t),6,0,Math.PI*2);ctx.fill();t+=0.025;requestAnimationFrame(r);}r();</script></body></html>`
	_ = os.WriteFile(filepath.Join(bookDir, "visuals", "01_orbit.html"), []byte(simHtml), 0644)
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

func extractTitle(content string, fileName string, fallbackIndex int) string {
	lines := strings.Split(content, "\n")
	for _, l := range lines {
		l = strings.TrimSpace(l)
		if l == "" || strings.HasPrefix(l, "---") {
			continue
		}
		if strings.HasPrefix(l, "#") {
			return strings.TrimSpace(strings.TrimLeft(l, "# \t"))
		}
		return l
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
