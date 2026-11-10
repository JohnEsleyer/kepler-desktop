package services

import (
	"archive/zip"
	"crypto/rand"
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
	app        *application.App
	activePath string
	mu         sync.RWMutex
}

func NewVaultService() *VaultService {
	vs := &VaultService{}
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

func (s *VaultService) ChooseVaultFolder() (string, error) {
	s.mu.RLock()
	app := s.app
	s.mu.RUnlock()

	if app == nil {
		return s.GetActiveVault(), fmt.Errorf("app not initialized")
	}

	// In Wails v3, directory selection is done via OpenFileDialog with directory selection enabled:
	dialog := app.Dialog.OpenFile().
		SetTitle("Select Esper Vault Folder").
		CanChooseDirectories(true).
		CanChooseFiles(false)

	dir, err := dialog.PromptForSingleSelection()
	if err != nil {
		return "", err
	}
	if dir == "" {
		return s.GetActiveVault(), nil
	}

	s.mu.Lock()
	s.activePath = dir
	s.mu.Unlock()

	return dir, nil
}

func (s *VaultService) initDefaultVault() {
	configDir, err := os.UserConfigDir()
	if err != nil {
		configDir = os.TempDir()
	}
	defaultPath := filepath.Join(configDir, "EsperVault")
	_ = os.MkdirAll(defaultPath, 0755)
	s.activePath = defaultPath

	// Check if empty, seed initial books
	entries, _ := os.ReadDir(defaultPath)
	if len(entries) == 0 {
		s.seedDefaultBooks(defaultPath)
	}
}

func (s *VaultService) seedDefaultBooks(root string) {
	// 1. Astrodynamics
	bookDir := filepath.Join(root, "Astrodynamics & Keplerian Orbits")
	_ = os.MkdirAll(filepath.Join(bookDir, "visuals"), 0755)

	meta := BookMeta{
		ID:          "book-astrodynamics",
		Title:       "Astrodynamics & Keplerian Orbits",
		Description: "Interactive celestial mechanics, vis-viva equations, and orbital transfers.",
		CoverPreset: "solar",
		Tags:        []string{"Physics", "Astrodynamics", "Space"},
		CreatedAt:   time.Now().UnixMilli(),
		UpdatedAt:   time.Now().UnixMilli(),
	}
	rawMeta, _ := json.MarshalIndent(meta, "", "  ")
	_ = os.WriteFile(filepath.Join(bookDir, "book.json"), rawMeta, 0644)

	ch1 := `# Keplerian Motion

Planetary motion obeys Kepler's three laws:

1. The orbit of a planet is an ellipse with the Sun at one of the two foci.
2. A line segment joining a planet and the Sun sweeps out equal areas during equal intervals of time.
3. The square of the orbital period is proportional to the cube of the semi-major axis.

$$\frac{T^2}{a^3} = \frac{4\pi^2}{G(M + m)}$$

Notice how the areal velocity remains constant:
$$\frac{dA}{dt} = \frac{1}{2} r^2 \dot{\theta} = \text{const}$$`
	_ = os.WriteFile(filepath.Join(bookDir, "01_Keplerian_Motion.md"), []byte(ch1), 0644)

	ch2 := `# The Vis-Viva Equation

For any Keplerian orbit, the velocity at distance $r$ from the central body is determined by:

$$v^2 = \mu \left( \frac{2}{r} - \frac{1}{a} \right)$$

Where:
- $v$ is orbital speed
- $\mu = GM$ is the standard gravitational parameter
- $r$ is orbital distance
- $a$ is semi-major axis`
	_ = os.WriteFile(filepath.Join(bookDir, "02_Vis-Viva_Energy.md"), []byte(ch2), 0644)

	simHtml := `<!doctype html>
<html>
<body style="margin:0;background:#030712;color:#818cf8;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:monospace;">
  <canvas id="c" width="400" height="400" style="background:#0b0f19;border-radius:12px;border:1px solid #1e293b;"></canvas>
  <div style="margin-top:12px;font-size:12px;">Keplerian Orbit Simulation (Offline Canvas)</div>
  <script>
    const c = document.getElementById('c'), ctx = c.getContext('2d');
    let t = 0;
    function frame() {
      ctx.clearRect(0,0,400,400);
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(200, 200, 140, 90, 0, 0, Math.PI*2); ctx.stroke();
      // Star
      ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(260, 200, 10, 0, Math.PI*2); ctx.fill();
      // Planet
      const x = 200 + 140 * Math.cos(t), y = 200 + 90 * Math.sin(t);
      ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI*2); ctx.fill();
      t += 0.02;
      requestAnimationFrame(frame);
    }
    frame();
  </script>
</body>
</html>`
	_ = os.WriteFile(filepath.Join(bookDir, "visuals", "01_orbit_simulation.html"), []byte(simHtml), 0644)
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
	re := regexp.MustCompile(`^[0-9._\-\s]+`)
	clean = re.ReplaceAllString(clean, "")
	if clean == "" {
		return fmt.Sprintf("Chapter %d", fallbackIndex+1)
	}
	return strings.ReplaceAll(clean, "_", " ")
}

func (s *VaultService) ScanVault() (*VaultScanResult, error) {
	s.mu.RLock()
	vaultRoot := s.activePath
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

		// Self-heal book.json if absent
		if err != nil {
			meta.CreatedAt = time.Now().UnixMilli()
			meta.UpdatedAt = time.Now().UnixMilli()
			updated, _ := json.MarshalIndent(meta, "", "  ")
			_ = os.WriteFile(metaFile, updated, 0644)
		}

		// Chapters (*.md)
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
				ID:        fmt.Sprintf("p-%s-%s", meta.ID, fn),
				BookID:    meta.ID,
				FileName:  fn,
				Title:     extractTitle(strContent, fn, idx),
				Content:   strContent,
				Position:  idx,
			})
		}

		// Questions
		questions := []Question{}
		rawQ, err := os.ReadFile(filepath.Join(bookDir, "questions.json"))
		if err == nil {
			_ = json.Unmarshal(rawQ, &questions)
		}

		// Visuals
		visuals := []Visual{}
		visualsDir := filepath.Join(bookDir, "visuals")
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

			// Extract chapter number prefix
			assigned := 1
			re := regexp.MustCompile(`^0*(\d+)`)
			matches := re.FindStringSubmatch(vf.Name())
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

	tagsList := make([]string, 0, len(allTags))
	for t := range allTags {
		tagsList = append(tagsList, t)
	}
	sort.Strings(tagsList)

	return &VaultScanResult{
		VaultPath: vaultRoot,
		Books:     books,
		Tags:      tagsList,
	}, nil
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
	body := fmt.Sprintf("# %s\n\nStart writing notes...", title)

	err := os.WriteFile(filepath.Join(bookPath, fileName), []byte(body), 0644)
	return fileName, err
}

func (s *VaultService) DeleteChapter(bookPath, fileName string) error {
	return os.Remove(filepath.Join(bookPath, fileName))
}

func (s *VaultService) CreateBook(title, description, tags, preset string) (string, error) {
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

	meta := BookMeta{
		ID:          "book-" + randomHex(4),
		Title:       title,
		Description: description,
		CoverPreset: preset,
		Tags:        tagList,
		CreatedAt:   time.Now().UnixMilli(),
		UpdatedAt:   time.Now().UnixMilli(),
	}
	metaData, _ := json.MarshalIndent(meta, "", "  ")
	_ = os.WriteFile(filepath.Join(bookDir, "book.json"), metaData, 0644)

	ch1 := fmt.Sprintf("# %s\n\nWelcome to your new notebook.", title)
	_ = os.WriteFile(filepath.Join(bookDir, "01_Introduction.md"), []byte(ch1), 0644)

	return bookDir, nil
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

func randomHex(bytes int) string {
	b := make([]byte, bytes)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}