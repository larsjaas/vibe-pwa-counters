package http

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	db "github.com/larsa/pwa-counter/backend/internal/db"
)

func GetTags(w http.ResponseWriter, r *http.Request, userID int) {
	tags, err := db.GetTagsForUser(userID)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	type tagResponse struct {
		ID         int       `json:"id"`
		UserEmail  string    `json:"user_email"`
		Name       string    `json:"name"`
		CreateTime time.Time `json:"createtime"`
		DeleteTime interface{} `json:"deletetime"`
	}

	resp := make([]tagResponse, 0, len(tags))
	for _, t := range tags {
		user, err := db.GetUserByID(t.UserID)
		email := "unknown"
		if err == nil {
			email = user.Email
		}
		resp = append(resp, tagResponse{
			ID:         t.ID,
			UserEmail:  email,
			Name:       t.Name,
			CreateTime: t.CreateTime,
			DeleteTime: t.DeleteTime,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func CreateTag(w http.ResponseWriter, r *http.Request, userID int) {
	var body struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	tag, err := db.InsertTag(userID, body.Name)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tag)
}

func UpdateTag(w http.ResponseWriter, r *http.Request, userID int) {
	tagIDStr := r.PathValue("id")
	tagID, err := strconv.Atoi(tagIDStr)
	if err != nil {
		http.Error(w, "invalid tag ID", http.StatusBadRequest)
		return
	}

	var body struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	updated, err := db.UpdateTag(userID, tagID, body.Name)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if !updated {
		http.Error(w, "tag not found or unauthorized", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func DeleteTag(w http.ResponseWriter, r *http.Request, userID int) {
	tagIDStr := r.PathValue("id")
	tagID, err := strconv.Atoi(tagIDStr)
	if err != nil {
		http.Error(w, "invalid tag ID", http.StatusBadRequest)
		return
	}

	updated, err := db.SoftDeleteTag(userID, tagID)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if !updated {
		http.Error(w, "tag not found or unauthorized", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func AddTagToCounter(w http.ResponseWriter, r *http.Request, userID int) {
	tagIDStr := r.PathValue("id")
	counterIDStr := r.PathValue("cid")
	tagID, errT := strconv.Atoi(tagIDStr)
	counterID, errC := strconv.Atoi(counterIDStr)
	if errT != nil || errC != nil {
		http.Error(w, "invalid tag or counter ID", http.StatusBadRequest)
		return
	}

	err := db.AddTagToCounter(userID, tagID, counterID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}
	users, err := db.GetUsersWithAccessToTag(tagID)
	if err == nil {
		for _, uid := range users {
			PublishEvent(uid, "UPDATED COUNTERS")
		}
	}
	w.WriteHeader(http.StatusOK)
}

func RemoveTagFromCounter(w http.ResponseWriter, r *http.Request, userID int) {
	tagIDStr := r.PathValue("id")
	counterIDStr := r.PathValue("cid")
	tagID, errT := strconv.Atoi(tagIDStr)
	counterID, errC := strconv.Atoi(counterIDStr)
	if errT != nil || errC != nil {
		http.Error(w, "invalid tag or counter ID", http.StatusBadRequest)
		return
	}

	updated, err := db.RemoveTagFromCounter(userID, tagID, counterID)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if !updated {
		http.Error(w, "association not found or unauthorized", http.StatusNotFound)
		return
	}
	users, err := db.GetUsersWithAccessToTag(tagID)
	if err == nil {
		for _, uid := range users {
			PublishEvent(uid, "UPDATED COUNTERS")
		}
	}
	w.WriteHeader(http.StatusOK)
}

func GetCountersForTag(w http.ResponseWriter, r *http.Request, userID int) {
	tagIDStr := r.PathValue("id")
	tagID, err := strconv.Atoi(tagIDStr)
	if err != nil {
		http.Error(w, "invalid tag ID", http.StatusBadRequest)
		return
	}

	counters, err := db.GetCountersByTag(userID, tagID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}
	ids := make([]int, 0, len(counters))
	for _, c := range counters {
		ids = append(ids, c.ID)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ids)
}

// handleGetTagSettings returns all tag-level settings for the authenticated user on a specific tag.
// Supports an optional ?key=... query to retrieve a single setting.
func GetTagSettings(w http.ResponseWriter, r *http.Request, userID int) {
	tagIDStr := r.PathValue("id")
	tagID, err := strconv.Atoi(tagIDStr)
	if err != nil {
		http.Error(w, "invalid tag ID", http.StatusBadRequest)
		return
	}

	key := r.URL.Query().Get("key")
	if key != "" {
		val, err := db.GetTagSetting(tagID, userID, key)
		if err != nil {
			log.Printf("handleGetTagSettings: GetTagSetting failed: %v", err)
			http.Error(w, "internal server error", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{key: val})
		return
	}

	settings, err := db.GetTagSettings(tagID, userID)
	if err != nil {
		log.Printf("handleGetTagSettings: GetTagSettings failed: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(settings)
}

// handleSetTagSetting creates or updates a single tag-level setting.
func SetTagSetting(w http.ResponseWriter, r *http.Request, userID int) {
	tagIDStr := r.PathValue("id")
	tagID, err := strconv.Atoi(tagIDStr)
	if err != nil {
		http.Error(w, "invalid tag ID", http.StatusBadRequest)
		return
	}

	var body struct {
		Setting string `json:"setting"`
		Value   string `json:"value"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	if body.Setting == "" {
		http.Error(w, "setting key required", http.StatusBadRequest)
		return
	}

	if err := db.SetTagSetting(tagID, userID, body.Setting, body.Value); err != nil {
		log.Printf("handleSetTagSetting: SetTagSetting failed: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

// handleDeleteTagSetting removes a single tag-level setting.
func DeleteTagSetting(w http.ResponseWriter, r *http.Request, userID int) {
	tagIDStr := r.PathValue("id")
	tagID, err := strconv.Atoi(tagIDStr)
	if err != nil {
		http.Error(w, "invalid tag ID", http.StatusBadRequest)
		return
	}

	key := r.URL.Query().Get("key")
	if key == "" {
		http.Error(w, "key query parameter required", http.StatusBadRequest)
		return
	}

	if err := db.DeleteTagSetting(tagID, userID, key); err != nil {
		log.Printf("handleDeleteTagSetting: DeleteTagSetting failed: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
