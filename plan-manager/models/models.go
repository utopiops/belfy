package models

type ApplicationSize string

const (
	Micro   ApplicationSize = "micro"
	Small   ApplicationSize = "small"
	Medium  ApplicationSize = "medium"
	Large   ApplicationSize = "large"
	XLarge  ApplicationSize = "xlarge"
	XXLarge ApplicationSize = "2xlarge"
	None    ApplicationSize = "none"
)

func GetApplicationsSize() []ApplicationSize {
	return []ApplicationSize{Micro, Small, Medium, Large, XLarge, XXLarge, None}
}

type BuildTimeAction string

const (
	BuyPackage        BuildTimeAction = "buy"
	InitializePackage BuildTimeAction = "initialize"
)

type Conf struct {
	ServiceName string `json:"service_name"`
	Url         string `json:"url"`
}

type Usage struct {
	AccountId    string  `json:"account_id" db:"account_id"`
	Plan         PlanDto `json:"plan"`
	StartAt      string  `json:"start_at" db:"start_at"`
	BandWidth    int     `json:"bandwidth" db:"bandwidth"`
	FunctionCall int     `json:"function_call" db:"function_call"`
	BuildTime    int     `json:"build_time" db:"build_time"`
	Users        int     `json:"users" db:"users"`
}

type MonthlyUsage struct {
	AccountId    string `json:"account_id" db:"account_id"`
	BandWidth    int    `json:"bandwidth" db:"bandwidth"`
	FunctionCall int    `json:"function_call" db:"function_call"`
}

type UserPlanDto struct {
	AccountId    string   `json:"account_id" db:"account_id" binding:"required"`
	Plan         PlanKind `json:"plan" db:"plan" binding:"required"`
	StartAt      string   `json:"start_at" db:"start_at" binding:"-"`
	EndAt        string   `json:"end_at" db:"end_at" binding:"-"`
	BandWidth    int      `json:"bandwidth" db:"bandwidth" binding:"required"`
	FunctionCall int      `json:"function_call" db:"function_call" binding:"required"`
	BuildTime    int      `json:"build_time" db:"build_time" binding:"required"`
	Users        int      `json:"users" db:"users" binding:"required"`
}

type BuildTimeDto struct {
	AccountId string `json:"account_id" binding:"required"`
	Seconds   int    `json:"seconds" db:"seconds" binding:"required"`
	AppName   string `json:"app_name" db:"app_name" binding:"required"`
	AppType   string `json:"app_type" db:"app_type" binding:"required"`
	CreateAt  string `json:"create_at" db:"create_at" binding:"-"`
}

type PlanDto struct {
	//Plan         PlanKind        `json:"plan"  db:"plan"`
	Name           PlanKind   `json:"name" db:"name"`
	Price          int64      `json:"price" db:"price"`                                   // in cents
	BuildTimePrice int64      `json:"build_time_price" db:"build_time_price" binding:"-"` //in cents
	BandWidth      int        `json:"bandwidth" db:"bandwidth" binding:"-"`
	FunctionCall   int        `json:"function_call" db:"function_call" binding:"-"`
	BuildTime      int        `json:"build_time" db:"build_time" binding:"-"`
	Users          int        `json:"users" db:"users" binding:"-"`
	Rules          Statements `json:"rules" db:"rules" binding:"-"`
}

type Limits struct {
	BandWidth    int `json:"bandwidth" db:"bandwidth" binding:"required"`
	FunctionCall int `json:"function_call" db:"function_call" binding:"required"`
	BuildTime    int `json:"build_time" db:"build_time" binding:"required"`
	Users        int `json:"users" db:"users" binding:"required"`
}
type CreatePlanDto struct {
	Service string   `json:"service" binding:"required"`
	Url     string   `json:"url" binding:"required"`
	Kind    PlanKind `json:"kind" binding:"required"`
	Plan    Plan     `json:"plan" binding:"required"`
}

type GetUsageDto struct {
	Start string `form:"start" binding:"required"`
	End   string `form:"end" binding:"required"`
}

type AccessDto struct {
	Access bool     `json:"access"`
	Plan   PlanKind `json:"plan"`
	Used   int      `json:"used"`
	Limit  int      `json:"limit"`
}

type Application struct {
	AccountId string  `json:"account_id" db:"account_id" binding:"required"`
	Name      string  `json:"name" db:"name" binding:"required"`
	Domain    *string `json:"domain" db:"domain" binding:"-"`
	Kind      *string `json:"kind" db:"kind" binding:"-"`
	Size      *string `json:"size" db:"size" binding:"-"`
	CreateAt  string  `json:"create_at" db:"create_at" binding:"-"`
	EndAt     *string `json:"end_at" db:"end_at" binding:"-"`
}

type CallFunctionDto struct {
	AccountId string `json:"account_id" binding:"required"`
	FuncName  string `json:"func_name" binding:"required"`
	AppName   string `json:"app_name" binding:"required"`
}

type FunctionCallsRecord struct {
	FuncName string `json:"func_name" db:"function_name" binding:"required"`
	AppName  string `json:"app_name" db:"application_name" binding:"required"`
	Count    int    `json:"count" binding:"required"`
}

type PlanHistoryDto struct {
	Action   string  `json:"action" db:"action"`
	NewPlan  string  `json:"new_plan" db:"new_plan"`
	LastPlan *string `json:"last_plan" db:"last_plan"`
	CreateAt string  `json:"create_at" db:"create_at"`
}

type BuildTimePack struct {
	Id      int     `json:"id" db:"id" binding:"required"`
	Minutes int     `json:"minutes" db:"minutes"`
	Fee     float64 `json:"fee" db:"fee"`
}

type BuildTimePackDto struct {
	PackId   int     `json:"pack_id" db:"pack_id"`
	Action   string  `json:"action" db:"action"`
	CreateAt string  `json:"create_at" db:"create_at"`
	Minutes  int     `json:"minutes" db:"minutes"`
	Fee      float64 `json:"fee" db:"fee"`
}

type UserPack struct {
	Id    int     `json:"id" db:"id" binding:"required"`
	Count int     `json:"count" db:"count"`
	Fee   float64 `json:"fee" db:"fee"`
}

type UserPackDto struct {
	PackId   int     `json:"pack_id" db:"pack_id"`
	CreateAt string  `json:"create_at" db:"create_at"`
	Count    int     `json:"count" db:"count"`
	Fee      float64 `json:"fee" db:"fee"`
}

type User struct {
	AccountId string `json:"account_id"  db:"account_id" binding:"required"`
	Username  string `json:"username" db:"username" binding:"required"`
	StartAt   string `json:"start_at" db:"create_at" binding:"-"`
	EndAt     string `json:"end_at" db:"end_at" binding:"-"`
}

type PackPriceDto struct {
	Buildtime int `json:"buildtime"`
	User      int `json:"user"`
}

type BandwidthDto struct {
	AccountId   string `json:"account_id" db:"account_id"`
	Application string `json:"application_name" db:"application"`
	Domain      string `json:"domain" db:"domain"`
	BandWidth   int    `json:"usage" db:"bandwidth"`
	StartAt     string `json:"start_at" db:"start_at"`
	EndAt       string `json:"end_at" db:"end_at"`
}

type BandwidthUsageDto struct {
	ApplicationName string `json:"applicationName" db:"application_name"`
	Domain          string `json:"domain" db:"domain"`
	Usage           int    `json:"usage" db:"usage"`
}
