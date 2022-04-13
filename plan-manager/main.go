package main

import (
	"log"

	"github.com/joho/godotenv"
	"gitlab.com/utopiops-water/plan-manager/app"
	"gitlab.com/utopiops-water/plan-manager/config"
	"gitlab.com/utopiops-water/plan-manager/controllers/healthcheck"
	"gitlab.com/utopiops-water/plan-manager/controllers/paymentController"
	"gitlab.com/utopiops-water/plan-manager/controllers/planController"
	"gitlab.com/utopiops-water/plan-manager/controllers/usageController"
	"gitlab.com/utopiops-water/plan-manager/db"
	"gitlab.com/utopiops-water/plan-manager/pkg/utils"
	"gitlab.com/utopiops-water/plan-manager/services/paymentService"
	"gitlab.com/utopiops-water/plan-manager/services/planService"
	"gitlab.com/utopiops-water/plan-manager/services/scheduleService"
	"gitlab.com/utopiops-water/plan-manager/services/usageService"
	"gitlab.com/utopiops-water/plan-manager/store/enforcer"
	"gitlab.com/utopiops-water/plan-manager/store/paymentStore"
	"gitlab.com/utopiops-water/plan-manager/store/planStore"
	"gitlab.com/utopiops-water/plan-manager/store/usageStore"
)

func init() {
	log.SetFlags(log.Llongfile)
	err := godotenv.Load()
	if err != nil {
		panic(err)
	}
	err = config.Load()
	if err != nil {
		panic(err)
	}
}

func main() {
	db, err := db.Connect(utils.DbConnStr())
	if err != nil {
		log.Fatalln(err)
	}
	planStore, err := planStore.New(db, config.Configs.Store.Plans)
	if err != nil {
		log.Fatalln(err)
	}
	enforcer, err := enforcer.NewEnforcer("casbin_model.conf")
	if err != nil {
		log.Fatalln(err)
	}
	usageStore, err := usageStore.New(db)
	if err != nil {
		log.Fatalln(err)
	}
	paymentStore := paymentStore.New()
	scheduler := scheduleService.New(planStore, usageStore, paymentStore)
	planService := planService.New(planStore, enforcer)
	usageService, err := usageService.New(usageStore, planStore, enforcer, paymentStore)
	if err != nil {
		log.Fatalln(err)
	}
	paymentService := paymentService.New(paymentStore)
	planController := planController.New(planService)
	usageController := usageController.New(usageService, paymentService)
	paymentController := paymentController.New(paymentService)
	healthController := healthcheck.New()
	scheduler.Start()
	app := app.New(healthController, planController, usageController, paymentController)
	log.Println(app.Start(":" + config.Configs.App.Port))
}
