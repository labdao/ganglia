package models

import (
	"time"
)

type File struct {
	ID             uint      `gorm:"primaryKey;autoIncrement"`
	FileHash       string    `gorm:"type:varchar(64);not null"`
	UserID         uint      `gorm:"not null"`
	User           User      `gorm:"foreignKey:UserID"`
	Filename       string    `gorm:"type:varchar(255);not null"`
	InputFiles     []Job     `gorm:"many2many:job_input_files;foreignKey:CID;joinForeignKey:file_c_id;inverseJoinForeignKey:job_id"`
	OutputFiles    []Job     `gorm:"many2many:job_output_files;foreignKey:CID;joinForeignKey:file_c_id;inverseJoinForeignKey:job_id"`
	Tags           []Tag     `gorm:"many2many:file_tags;foreignKey:CID;joinForeignKey:file_c_id;inverseJoinForeignKey:tag_name"`
	Public         bool      `gorm:"type:boolean;not null;default:false"`
	UserFiles      []User    `gorm:"many2many:user_files;foreignKey:CID;joinForeignKey:c_id;inverseJoinForeignKey:wallet_address"`
	S3URI          string    `gorm:"type:varchar(255)"`
	CreatedAt      time.Time `gorm:"autoCreateTime"`
	LastModifiedAt time.Time `gorm:"autoUpdateTime"`
}
