package models

type RayJobResponse struct {
	UUID   string                `json:"uuid"`
	PDB    FileDetail            `json:"pdb"`
	Scores map[string]float64    `json:"-"`
	Files  map[string]FileDetail `json:"-"`
}

type FileDetail struct {
	URI string `json:"uri"`
}
