package config

import (
	"bufio"
	"os"
	"strings"
)

// loadDotEnv reads a .env file (if present) in the current working
// directory and applies its KEY=VALUE pairs to the process environment via
// os.Setenv — but only for keys that aren't already set. This means real
// environment variables (the shell, a deploy platform's env config, etc.)
// always win over .env, matching how most .env tooling behaves elsewhere.
//
// This exists because previously nothing read .env at all: Load() called
// os.LookupEnv directly, so DATABASE_URL (and anything else) had to be
// exported manually in the shell before running the binary — easy to miss
// locally, and the resulting error ("DATABASE_URL is not set") gave no hint
// that a `.env` file sitting right there wasn't being picked up.
//
// Deliberately dependency-free (no godotenv or similar) — this is a small
// enough job not to need one, and adding a new Go module here isn't safe
// to do without a Go toolchain available to run `go mod tidy` and verify
// the resulting go.sum entry.
//
// Parsing is intentionally simple: it does not support multi-line values,
// variable expansion (e.g. $OTHER_VAR), or escaped characters beyond
// stripping one layer of surrounding quotes. That covers every line in
// .env.example — if a future value needs more than that, it's a sign this
// should be swapped for a real library at that point.
func loadDotEnv(path string) {
	file, err := os.Open(path)
	if err != nil {
		// No .env file (e.g. production, where real env vars are set by
		// the platform) — that's expected, not an error worth logging.
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())

		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		key, value, found := strings.Cut(line, "=")
		if !found {
			continue
		}

		key = strings.TrimSpace(key)
		value = strings.TrimSpace(value)
		value = unquote(value)

		if key == "" {
			continue
		}

		// Don't override a real, already-set environment variable.
		if _, alreadySet := os.LookupEnv(key); alreadySet {
			continue
		}

		os.Setenv(key, value)
	}
}

// unquote strips one layer of matching surrounding quotes, e.g.
// `"postgres://..."` -> `postgres://...`. Leaves the value untouched if it
// isn't quoted, or the quotes don't match.
func unquote(value string) string {
	if len(value) < 2 {
		return value
	}
	first, last := value[0], value[len(value)-1]
	if (first == '"' && last == '"') || (first == '\'' && last == '\'') {
		return value[1 : len(value)-1]
	}
	return value
}