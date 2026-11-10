package services

type BookMeta struct {
	ID               string   `json:"id"`
	Title            string   `json:"title"`
	Description      string   `json:"description"`
	CoverPreset      string   `json:"coverPreset"`
	CoverImage       *string  `json:"coverImage"` // base64 data URL or relative path
	ShowTitleOnCover bool     `json:"showTitleOnCover"`
	Tags             []string `json:"tags"`
	IsPinned         bool     `json:"isPinned"`
	CreatedAt        int64    `json:"createdAt"`
	UpdatedAt        int64    `json:"updatedAt"`
}

type Chapter struct {
	ID       string `json:"id"`
	BookID   string `json:"bookId"`
	FileName string `json:"fileName"`
	Title    string `json:"title"`
	Content  string `json:"content"`
	Position int    `json:"position"`
}

type Question struct {
	ID       string `json:"id"`
	Title    string `json:"title"`
	Answer   string `json:"answer"`
	Position int    `json:"position"`
}

type Visual struct {
	FileName   string `json:"fileName"`
	Title      string `json:"title"`
	Kind       string `json:"kind"` // "html" | "json"
	AssignedCh int    `json:"assignedChapter"`
	Content    string `json:"content"`
}

type Book struct {
	Meta      BookMeta   `json:"meta"`
	Path      string     `json:"path"`
	Chapters  []Chapter  `json:"chapters"`
	Questions []Question `json:"questions"`
	Visuals   []Visual   `json:"visuals"`
}

type WorkspaceEntry struct {
	Path      string `json:"path"`
	Name      string `json:"name"`
	BookCount int    `json:"bookCount"`
}

type VaultScanResult struct {
	VaultPath       string           `json:"vaultPath"`
	Books           []Book           `json:"books"`
	Tags            []string         `json:"tags"`
	Workspaces      []WorkspaceEntry `json:"workspaces"`
	ActiveWorkspace string           `json:"activeWorkspace"`
}
