package main

import (
	"embed"
	"log"

	"changeme/services"

	"github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	vaultService := services.NewVaultService()

	app := application.New(application.Options{
		Name:        "esper-desktop",
		Description: "Esper - Offline Knowledge & Interactive Vault",
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Services: []application.Service{
			application.NewService(vaultService),
		},
	})

	vaultService.SetApp(app)

	app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:            "Esper",
		Width:            1280,
		Height:           820,
		BackgroundColour: application.NewRGB(3, 7, 18),
		URL:              "/",
	})

	if err := app.Run(); err != nil {
		log.Fatal(err)
	}
}