package main

import (
	"bufio"
	"fmt"
	"os"

	"github.com/glimesh/broadcast-box/internal/webrtc"
	"github.com/joho/godotenv"
)

const (
	envFileProd = ".env.production"
	envFileDev  = ".env.development"
)

func main() {
	if os.Getenv("APP_ENV") == "production" {
		godotenv.Load(envFileProd)
	} else {
		godotenv.Load(envFileDev)
	}

	scanner := bufio.NewScanner(os.Stdin)
	for scanner.Scan() {
		inKey := scanner.Text()

		whipKey, err := webrtc.EncodeWhipStreamKey(inKey)
		if err != nil {
			fmt.Printf("error: %s\n", err)
			os.Exit(1)
		}

		whepKey, err := webrtc.EncodeWhepStreamKey(inKey)
		if err != nil {
			fmt.Printf("error: %s\n", err)
			os.Exit(1)
		}
		fmt.Printf("%s,%s,%s\n", inKey, whipKey, whepKey)
	}
}
