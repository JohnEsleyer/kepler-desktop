func (s *VaultService) initDefaultVault() {
	configDir, err := os.UserConfigDir()
	if err != nil {
		configDir = os.TempDir()
	}
	defaultPath := filepath.Join(configDir, "EsperVault")
	_ = os.MkdirAll(defaultPath, 0755)
	s.activePath = defaultPath

	// Check if there are any book folders
	entries, _ := os.ReadDir(defaultPath)
	hasBooks := false
	for _, e := range entries {
		if e.IsDir() && !strings.HasPrefix(e.Name(), ".") {
			hasBooks = true
			break
		}
	}

	if !hasBooks {
		s.seedDefaultBooks(defaultPath)
	}
}