package main

import (
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/nbd-wtf/go-nostr"
)

type blobDescriptor struct {
	URL      string `json:"url"`
	SHA256   string `json:"sha256"`
	Size     int64  `json:"size"`
	Type     string `json:"type"`
	Uploaded int64  `json:"uploaded"`
}

type blobMeta struct {
	SHA256   string `json:"sha256"`
	Type     string `json:"type"`
	Size     int64  `json:"size"`
	Uploaded int64  `json:"uploaded"`
}

type server struct {
	dataDir string
}

func newServer(dataDir string) *server {
	return &server{dataDir: dataDir}
}

func (s *server) blobPath(hash string) string { return filepath.Join(s.dataDir, hash) }
func (s *server) metaPath(hash string) string  { return s.blobPath(hash) + ".meta" }

func (s *server) readMeta(hash string) (*blobMeta, error) {
	b, err := os.ReadFile(s.metaPath(hash))
	if err != nil {
		return nil, err
	}
	var m blobMeta
	if err := json.Unmarshal(b, &m); err != nil {
		return nil, err
	}
	return &m, nil
}

func (s *server) writeMeta(hash string, m *blobMeta) error {
	b, err := json.Marshal(m)
	if err != nil {
		return err
	}
	return os.WriteFile(s.metaPath(hash), b, 0644)
}

func (s *server) blobExists(hash string) bool {
	_, err := os.Stat(s.blobPath(hash))
	return err == nil
}

func extensionForType(t string) string {
	switch t {
	case "image/jpeg":
		return ".jpg"
	case "image/png":
		return ".png"
	case "image/gif":
		return ".gif"
	case "image/webp":
		return ".webp"
	case "image/svg+xml":
		return ".svg"
	case "application/pdf":
		return ".pdf"
	case "text/plain":
		return ".txt"
	case "text/html":
		return ".html"
	case "application/json":
		return ".json"
	case "audio/mpeg":
		return ".mp3"
	case "audio/ogg":
		return ".ogg"
	case "video/mp4":
		return ".mp4"
	case "video/webm":
		return ".webm"
	default:
		return ""
	}
}

func parseSHA256(s string) (hash, ext string) {
	if idx := strings.LastIndex(s, "."); idx > 0 {
		ext = s[idx:]
		s = s[:idx]
	}
	if len(s) == 64 {
		_, err := hex.DecodeString(s)
		if err == nil {
			return s, ext
		}
	}
	return "", ""
}

func (s *server) handleNIP96(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, 200, map[string]string{
		"api_url": "",
		"name":    "TutorHub Dev Blossom",
	})
}

func (s *server) handleUploadHead(w http.ResponseWriter, r *http.Request) {
	// BUD-06: return upload requirements (HEAD, no body)
	if auth := r.Header.Get("Authorization"); auth != "" {
		if sha := r.Header.Get("X-SHA-256"); sha != "" {
			s.verifyAuth(r, "upload", sha)
		}
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Max-Size", "104857600")
	w.WriteHeader(200)
}

func (s *server) handleUpload(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, 400, "Failed to read body")
		return
	}
	r.Body.Close()

	hash := sha256.Sum256(body)
	computedSHA := hex.EncodeToString(hash[:])

	// X-SHA-256 is optional per BUD-02; validate if provided
	if clientSHA := r.Header.Get("X-SHA-256"); clientSHA != "" && clientSHA != computedSHA {
		writeError(w, 409, "X-SHA-256 does not match body")
		return
	}

	// Auth is verified if present, but not required (dev mode)
	if auth := r.Header.Get("Authorization"); auth != "" {
		if _, err := s.verifyAuth(r, "upload", computedSHA); err != nil {
			writeError(w, 401, err.Error())
			return
		}
	}

	exists := s.blobExists(computedSHA)
	if !exists {
		contentType := r.Header.Get("Content-Type")
		if contentType == "" {
			contentType = "application/octet-stream"
		}

		if err := os.WriteFile(s.blobPath(computedSHA), body, 0644); err != nil {
			writeError(w, 500, "Failed to store blob")
			return
		}

		meta := &blobMeta{
			SHA256:   computedSHA,
			Type:     contentType,
			Size:     int64(len(body)),
			Uploaded: time.Now().Unix(),
		}
		if err := s.writeMeta(computedSHA, meta); err != nil {
			os.Remove(s.blobPath(computedSHA))
			writeError(w, 500, "Failed to store metadata")
			return
		}
	}

	meta, _ := s.readMeta(computedSHA)
	if meta == nil {
		meta = &blobMeta{
			SHA256:   computedSHA,
			Type:     "application/octet-stream",
			Size:     int64(len(body)),
			Uploaded: time.Now().Unix(),
		}
	}

	scheme := "http"
	if r.TLS != nil {
		scheme = "https"
	}
	baseURL := fmt.Sprintf("%s://%s", scheme, r.Host)

	ext := extensionForType(meta.Type)
	desc := blobDescriptor{
		URL:      fmt.Sprintf("%s/%s%s", baseURL, computedSHA, ext),
		SHA256:   computedSHA,
		Size:     meta.Size,
		Type:     meta.Type,
		Uploaded: meta.Uploaded,
	}

	status := 201
	if exists {
		status = 200
	}
	writeJSON(w, status, desc)
}

func (s *server) handleGet(w http.ResponseWriter, r *http.Request) {
	hash, ext := parseSHA256(r.PathValue("sha256"))
	if hash == "" {
		writeError(w, 400, "Invalid SHA-256")
		return
	}

	if !s.blobExists(hash) {
		writeError(w, 404, "Not found")
		return
	}

	meta, err := s.readMeta(hash)
	if err != nil {
		writeError(w, 404, "Not found")
		return
	}

	contentType := meta.Type
	if ext != "" {
		if t := mime.TypeByExtension(ext); t != "" {
			contentType = t
		}
	}

	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Content-Length", fmt.Sprintf("%d", meta.Size))
	w.Header().Set("Accept-Ranges", "bytes")
	http.ServeFile(w, r, s.blobPath(hash))
}

func (s *server) handleHead(w http.ResponseWriter, r *http.Request) {
	hash, ext := parseSHA256(r.PathValue("sha256"))
	if hash == "" {
		writeError(w, 400, "Invalid SHA-256")
		return
	}

	if !s.blobExists(hash) {
		writeError(w, 404, "Not found")
		return
	}

	meta, err := s.readMeta(hash)
	if err != nil {
		writeError(w, 404, "Not found")
		return
	}

	contentType := meta.Type
	if ext != "" {
		if t := mime.TypeByExtension(ext); t != "" {
			contentType = t
		}
	}

	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Content-Length", fmt.Sprintf("%d", meta.Size))
	w.WriteHeader(200)
}

func (s *server) handleDelete(w http.ResponseWriter, r *http.Request) {
	hash, _ := parseSHA256(r.PathValue("sha256"))
	if hash == "" {
		writeError(w, 400, "Invalid SHA-256")
		return
	}

	if _, err := s.verifyAuth(r, "delete", hash); err != nil {
		writeError(w, 401, err.Error())
		return
	}

	if !s.blobExists(hash) {
		writeError(w, 404, "Not found")
		return
	}

	os.Remove(s.blobPath(hash))
	os.Remove(s.metaPath(hash))
	w.WriteHeader(200)
}

func (s *server) verifyAuth(r *http.Request, action, blobHash string) (string, error) {
	auth := r.Header.Get("Authorization")
	if auth == "" {
		return "", fmt.Errorf("missing Authorization header")
	}

	if !strings.HasPrefix(auth, "Nostr ") {
		return "", fmt.Errorf("invalid Authorization scheme")
	}
	encoded := strings.TrimPrefix(auth, "Nostr ")

	eventJSON, err := base64.RawURLEncoding.DecodeString(encoded)
	if err != nil {
		return "", fmt.Errorf("invalid base64: %w", err)
	}

	var evt nostr.Event
	if err := json.Unmarshal(eventJSON, &evt); err != nil {
		return "", fmt.Errorf("invalid event: %w", err)
	}

	if evt.Kind != 24242 {
		return "", fmt.Errorf("invalid kind: expected 24242, got %d", evt.Kind)
	}

	if evt.CreatedAt.Time().After(time.Now()) {
		return "", fmt.Errorf("event is from the future")
	}

	expTag := evt.Tags.GetFirst([]string{"expiration"})
	if expTag == nil || len(*expTag) < 2 {
		return "", fmt.Errorf("missing expiration tag")
	}
	expUnix, err := parseUnix((*expTag)[1])
	if err != nil {
		return "", fmt.Errorf("invalid expiration: %w", err)
	}
	if time.Now().After(time.Unix(expUnix, 0)) {
		return "", fmt.Errorf("authorization expired")
	}

	tTag := evt.Tags.GetFirst([]string{"t"})
	if tTag == nil || len(*tTag) < 2 || (*tTag)[1] != action {
		return "", fmt.Errorf("invalid action: expected %s", action)
	}

	if action == "upload" || action == "delete" {
		xTag := evt.Tags.GetFirst([]string{"x"})
		if xTag == nil || len(*xTag) < 2 {
			return "", fmt.Errorf("missing x tag")
		}
		if (*xTag)[1] != blobHash {
			return "", fmt.Errorf("x tag does not match blob hash")
		}
	}

	ok, err := evt.CheckSignature()
	if err != nil {
		return "", fmt.Errorf("signature check error: %w", err)
	}
	if !ok {
		return "", fmt.Errorf("invalid signature")
	}

	return evt.PubKey, nil
}

func parseUnix(s string) (int64, error) {
	var n int64
	for _, c := range s {
		if c < '0' || c > '9' {
			return 0, fmt.Errorf("not a number")
		}
		n = n*10 + int64(c-'0')
	}
	return n, nil
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	w.Header().Set("X-Reason", msg)
	http.Error(w, msg, status)
}

func redirectHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path == "/" {
		http.Redirect(w, r, "/.well-known/nostr/nip96.json", 302)
		return
	}
	http.NotFound(w, r)
}

func main() {
	port := os.Getenv("BLOSSOM_PORT")
	if port == "" {
		port = "3000"
	}
	dataDir := os.Getenv("BLOSSOM_DATA_DIR")
	if dataDir == "" {
		dataDir = filepath.Join(".", "blobs")
	}
	absDir, err := filepath.Abs(dataDir)
	if err != nil {
		log.Fatalf("invalid data dir: %v", err)
	}
	if err := os.MkdirAll(absDir, 0755); err != nil {
		log.Fatalf("mkdir data dir: %v", err)
	}

	s := newServer(absDir)
	mux := http.NewServeMux()

	mux.HandleFunc("GET /.well-known/nostr/nip96.json", s.handleNIP96)
	mux.HandleFunc("HEAD /upload", s.handleUploadHead)
	mux.HandleFunc("PUT /upload", s.handleUpload)
	mux.HandleFunc("DELETE /{sha256}", s.handleDelete)
	mux.HandleFunc("GET /{sha256}", s.handleGet)
	mux.HandleFunc("HEAD /{sha256}", s.handleHead)
	mux.HandleFunc("/", redirectHandler)

	log.Printf("Blossom server starting on :%s (data: %s)", port, absDir)
	if err := http.ListenAndServe(":"+port, corsMiddleware(mux)); err != nil {
		log.Fatal(err)
	}
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, Content-Length, X-SHA-256, X-Content-Type, X-Content-Length, X-Reason")
		w.Header().Set("Access-Control-Allow-Methods", "GET, HEAD, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Max-Age", "86400")
		if r.Method == "OPTIONS" {
			w.WriteHeader(204)
			return
		}
		next.ServeHTTP(w, r)
	})
}
