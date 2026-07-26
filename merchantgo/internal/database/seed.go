package database

import (
	"encoding/json"

	"gorm.io/gorm"

	"merchantgo/internal/models"
)

// SeedDefaultPlans crée les 5 formules par défaut (Gratuit/Starter/Pro/
// Business/Enterprise) si la table est vide — n'écrase jamais des plans
// déjà personnalisés par l'admin. Prix indicatifs en FCFA, à ajuster
// depuis koli-admin une fois en place.
func SeedDefaultPlans(db *gorm.DB) error {
	var count int64
	if err := db.Model(&models.SubscriptionPlan{}).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	features := func(items ...string) string {
		b, _ := json.Marshal(items)
		return string(b)
	}

	plans := []models.SubscriptionPlan{
		{
			Slug: "gratuit", Name: "Gratuit",
			MaxProducts: 20, MaxEmployees: 1, MaxOrders: 50, StorageLimitMb: 200,
			CommissionRate: 8, PriceMonthly: 0, PriceYearly: 0,
			Features: features("20 produits", "1 utilisateur", "Support communautaire"),
			IsActive: true, Position: 1,
		},
		{
			Slug: "starter", Name: "Starter",
			MaxProducts: 100, MaxEmployees: 2, MaxOrders: 300, StorageLimitMb: 1000,
			CommissionRate: 5, PriceMonthly: 5000, PriceYearly: 50000,
			Features: features("100 produits", "2 utilisateurs", "Support email"),
			IsActive: true, Position: 2,
		},
		{
			Slug: "pro", Name: "Pro",
			MaxProducts: 500, MaxEmployees: 5, MaxOrders: 1500, StorageLimitMb: 5000,
			CommissionRate: 3, PriceMonthly: 15000, PriceYearly: 150000,
			Features: features("500 produits", "5 utilisateurs", "Support prioritaire", "Statistiques avancées"),
			IsActive: true, Position: 3,
		},
		{
			Slug: "business", Name: "Business",
			MaxProducts: 2000, MaxEmployees: 15, MaxOrders: 6000, StorageLimitMb: 20000,
			CommissionRate: 1.5, PriceMonthly: 35000, PriceYearly: 350000,
			Features: features("2000 produits", "15 utilisateurs", "Support dédié", "API avancée"),
			IsActive: true, Position: 4,
		},
		{
			Slug: "enterprise", Name: "Enterprise",
			MaxProducts: 0, MaxEmployees: 0, MaxOrders: 0, StorageLimitMb: 0,
			CommissionRate: 0, PriceMonthly: 100000, PriceYearly: 1000000,
			Features: features("Produits illimités", "Utilisateurs illimités", "Account manager dédié", "SLA garanti"),
			IsActive: true, Position: 5,
		},
	}

	return db.Create(&plans).Error
}
