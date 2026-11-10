package main

import (
	"embed"
	"log"
	"os"

	"changeme/services"

	"github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	vaultService := services.NewVaultService()

	// CLI support: `esper <path>` (or `esper --workspace <path>`).
	// The first non-flag argument is treated as the workspace folder to open.
	args := os.Args[1:]
	var targetPath string
	for i := 0; i < len(args); i++ {
		arg := args[i]
		if arg == "--workspace" || arg == "-w" {
			if i+1 < len(args) {
				targetPath = args[i+1]
				i++
			}
			continue
		}
		if len(arg) > 0 && arg[0] != '-' {
			targetPath = arg
			break
		}
	}
	if targetPath != "" {
		vaultService.OpenTerminalPath(targetPath)
	}

	app := application.New(application.Options{
		Name:        "kepler",
		Description: "Kepler - Offline Knowledge & Interactive Vault",
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Services: []application.Service{
			application.NewService(vaultService),
		},
	})

	vaultService.SetApp(app)

	app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:            "Kepler",
		Width:            1380,
		Height:           880,
		BackgroundColour: application.NewRGB(3, 7, 18),
		URL:              "/",
	})

	if err := app.Run(); err != nil {
		log.Fatal(err)
	}
}
