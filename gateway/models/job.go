package models

type Job struct {
	BacalhauJobID string `gorm:"primaryKey;type:varchar(255);not null"`
	State         string `gorm:"type:varchar(255);default:'processing'"`
	Error         string `gorm:"type:text;default:''"`
	WalletAddress string `gorm:"type:varchar(255)"`
	ToolID        string `gorm:"type:varchar(255);not null;index"`
	Tool          Tool   `gorm:"foreignKey:ToolID"`
	FlowID        string `gorm:"type:varchar(255);not null;index"`
	Flow          Flow   `gorm:"foreignKey:FlowID"`
}
