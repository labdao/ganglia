package models

import (
	"time"

	"gorm.io/datatypes"
)

type Model struct {
	ID                 uint           `gorm:"primaryKey;autoIncrement"`
	Name               string         `gorm:"type:text;not null;unique"`
	UserID             uint           `gorm:"not null"`
	User               User           `gorm:"foreignKey:UserID"`
	ModelJson          datatypes.JSON `gorm:"type:json"`
	CreatedAt          time.Time      `gorm:"autoCreateTime"`
	Display            bool           `gorm:"type:boolean;default:true"`
	TaskCategory       string         `gorm:"type:text;default:'community-models'"`
	DefaultModel       bool           `gorm:"type:boolean;default:false"`
	MaxRunningTime     int            `gorm:"type:int;default:2700"`
	ComputeCost        int            `gorm:"type:int;not null;default:0"`
	RayServiceEndpoint string         `gorm:"type:varchar(255)"`
}
