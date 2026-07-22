package handlers

import (
	"github.com/gin-gonic/gin/binding"
	"github.com/go-playground/validator/v10"

	"stockgo/internal/validation"
)

// registerCustomValidators branche des règles de validation métier sur le
// moteur utilisé par c.ShouldBind/ShouldBindQuery — même regex que la
// validation appliquée côté service (validation.BucketNameRegex), pour
// qu'un nom de bucket invalide soit rejeté dès la frontière HTTP (400 clair)
// plutôt que de descendre jusqu'à la couche métier.
func registerCustomValidators() {
	v, ok := binding.Validator.Engine().(*validator.Validate)
	if !ok {
		return
	}
	_ = v.RegisterValidation("bucketname", func(fl validator.FieldLevel) bool {
		val := fl.Field().String()
		if val == "" {
			return true // la présence est gérée par "omitempty"
		}
		return validation.BucketNameRegex.MatchString(val)
	})
}
