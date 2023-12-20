package webrtc

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"os"
	"strings"
)

const (
	PrefixWhip = "live_"
	PrefixWhep = "play_"
)

func DecodeWhipStreamKey(streamKey string) (string, error) {
	return decodeStreamKey(streamKey, PrefixWhip)
}

func DecodeWhepStreamKey(streamKey string) (string, error) {
	return decodeStreamKey(streamKey, PrefixWhep)
}

func EncodeWhipStreamKey(streamKey string) (string, error) {
	return encodeStreamKey(streamKey, PrefixWhip)
}

func EncodeWhepStreamKey(streamKey string) (string, error) {
	return encodeStreamKey(streamKey, PrefixWhep)
}

func decodeStreamKey(streamKey string, prefix string) (string, error) {
	streamKey = streamKey[len("Bearer "):]
	if !strings.HasPrefix(streamKey, prefix) {
		return "", errors.New("Invalid stream key - unsupported prefix")
	}
	i := strings.LastIndexByte(streamKey, '.')
	if i < 0 {
		return "", errors.New("Invalid stream key - no authenticator")
	}

	expected_authenticator, err := base64.RawURLEncoding.DecodeString(streamKey[i+1:])
	if err != nil {
		return "", err
	}

	hmac_key, err := hex.DecodeString(os.Getenv("HMAC_KEY"))
	if err != nil {
		return "", err
	}
	if len(hmac_key) == 0 {
		return "", errors.New("No HMAC key set")
	}

	mac := hmac.New(sha256.New, hmac_key)
	mac.Write([]byte(streamKey[:i]))
	actual_authenticator := mac.Sum(nil)

	if !hmac.Equal(actual_authenticator, expected_authenticator) {
		return "", errors.New("Invalid stream key - bad authenticator")
	}

	streamKey = streamKey[len(prefix):i]
	return streamKey, nil
}

func encodeStreamKey(streamKey string, prefix string) (string, error) {
	streamKey = prefix + streamKey

	hmac_key, err := hex.DecodeString(os.Getenv("HMAC_KEY"))
	if err != nil {
		return "", err
	}
	if len(hmac_key) == 0 {
		return "", errors.New("No HMAC key set")
	}

	mac := hmac.New(sha256.New, hmac_key)
	mac.Write([]byte(streamKey))
	actual_authenticator := mac.Sum(nil)
	return streamKey + "." + base64.RawURLEncoding.EncodeToString(actual_authenticator), nil
}
