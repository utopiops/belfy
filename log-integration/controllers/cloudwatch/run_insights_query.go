package cloudwatch

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/cloudwatchlogs"
	"github.com/gin-gonic/gin"
	"gitlab.com/utopiops-water/log-integration/config"
	"gitlab.com/utopiops-water/log-integration/shared"
	"gitlab.com/utopiops-water/log-integration/stores"
)

func (controller *CloudwatchController) RunInsightsQuery(httpHelper shared.HttpHelper, settingsStore stores.SettingsStore) gin.HandlerFunc {
	return func(c *gin.Context) {

		type runInsightsQueryDto struct {
			// The end of the time range to query. The range is inclusive, so the specified
			// end time is included in the query. Specified as epoch time, the number of
			// seconds since January 1, 1970, 00:00:00 UTC.
			//
			// EndTime is a required field
			EndTime *int64 `json:"endTime"`

			// The query string to use. For more information, see CloudWatch Logs Insights
			// Query Syntax (https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html).
			//
			// QueryString is a required field
			QueryString *string `json:"queryString"`

			// The beginning of the time range to query. The range is inclusive, so the
			// specified start time is included in the query. Specified as epoch time, the
			// number of seconds since January 1, 1970, 00:00:00 UTC.
			//
			// StartTime is a required field
			StartTime    *int64  `json:"startTime"`
			LogGroupName *string `json:logGroupName"`
		}

		dto := runInsightsQueryDto{}

		if err := c.ShouldBind(&dto); err != nil {
			c.JSON(http.StatusBadRequest, shared.ErrorResponse{
				Code:    http.StatusBadRequest,
				Title:   "Invalid body in the message",
				Details: err.Error(),
			})
			return
		}

		authHeader := c.Request.Header.Get("Authorization")
		// tokenString := strings.TrimSpace(strings.SplitN(authHeader, "Bearer", 2)[1])
		// accountID, err := shared.GetAccountId(tokenString)
		accountIdInterface, exists := c.Get("accountId")
		if !exists {
			c.Status(http.StatusBadRequest)
			return
		}
		accountID := accountIdInterface.(string)

		environmentName := c.Param("env_name")
		applicationName := c.Param("app_Name")

		// Get the cloudwatch settings (should exist, o.w. bad request)
		settings, err := settingsStore.GetCloudwatchApplicationSettings(noContext, accountID, environmentName, applicationName)
		if err != nil {
			log.Println(err.Error())
			if err.Error() == "Not found" {
				c.Status(http.StatusBadRequest)
				return
			}
			c.Status(http.StatusInternalServerError)
			return
		}

		// Get the provider credentials to be able to access CloudWatch
		var respDto struct {
			Credentials struct {
				AccessKeyId     string `json:"accessKeyId"`
				SecretAccessKey string `json:"secretAccessKey"`
			}
		}

		// Get the access token and url
		url := fmt.Sprintf("%s/v3/environment/name/%s/provider/credentials", config.Configs.Endpoints.Core, environmentName)
		headers := []shared.Header{
			{
				Key:   "Authorization",
				Value: authHeader, // We just pass on the user's token
			},
		}
		idToken, err := c.Cookie("id_token")
		/*if err != nil {
			c.AbortWithStatus(http.StatusBadRequest)
			return
		}*/
		if err == nil {
			headers = append(headers, shared.Header{
				Key:   "Cookie",
				Value: fmt.Sprintf("id_token=%s", idToken),
			})
		}
		out, err, statusCode, _ := httpHelper.HttpRequest(http.MethodGet, url, nil, headers, 0)
		if err != nil || statusCode != http.StatusOK {
			c.Status(http.StatusBadRequest)
			return
		}
		err = json.Unmarshal(out, &respDto)
		if err != nil {
			c.Status(http.StatusInternalServerError)
			return
		}

		sess := session.Must(session.NewSessionWithOptions(session.Options{
			// TODO: Get the region from the core
			Config: aws.Config{Region: &settings.Region, Credentials: credentials.NewStaticCredentials(respDto.Credentials.AccessKeyId, respDto.Credentials.SecretAccessKey, string(""))},
		}))

		svc := cloudwatchlogs.New(sess)

		input := cloudwatchlogs.StartQueryInput{
			LogGroupName: dto.LogGroupName,
			StartTime:    dto.StartTime,
			EndTime:      dto.EndTime,
			QueryString:  dto.QueryString,
		}

		if err := input.Validate(); err != nil {
			c.JSON(http.StatusBadRequest, shared.ErrorResponse{
				Code:    http.StatusBadRequest,
				Title:   "Invalid Query",
				Details: err.Error(),
			})
			return
		}

		req, startQueryOutput := svc.StartQueryRequest(&input)

		err = req.Send()
		if err != nil {
			if mqe, ok := err.(*cloudwatchlogs.MalformedQueryException); ok {
				c.JSON(http.StatusBadRequest, shared.ErrorResponse{
					Code:    mqe.RespMetadata.StatusCode,
					Title:   "Malformed Query Exception",
					Details: *mqe.Message_,
				})
				return
			}
			c.JSON(http.StatusInternalServerError, shared.ErrorResponse{
				Code:    http.StatusInternalServerError,
				Details: err.Error(),
			})
			return
		}
		ctx, cancel := context.WithTimeout(context.Background(), time.Duration(20)*time.Second)
		resultsOutput, err := getQueryResults(ctx, svc, *startQueryOutput.QueryId)
		if err != nil {
			fmt.Println(err.Error())
			c.JSON(http.StatusInternalServerError, shared.ErrorResponse{
				Code:    http.StatusInternalServerError,
				Details: err.Error(),
			})
			cancel()
			return
		}
		cancel()
		c.JSON(http.StatusOK, resultsOutput)

	}

}

func getQueryResults(ctx context.Context, cwl *cloudwatchlogs.CloudWatchLogs, queryId string) (*cloudwatchlogs.GetQueryResultsOutput, error) {
	getQueryResultInput := &cloudwatchlogs.GetQueryResultsInput{}
	getQueryResultInput.SetQueryId(queryId)
	for {
		getQueryResultOutput, err := cwl.GetQueryResultsWithContext(ctx, getQueryResultInput)
		if err != nil {
			return nil, err
		}
		time.Sleep(5 * time.Second)
		switch *getQueryResultOutput.Status {
		case "Running":
			continue
		case "Scheduled":
			continue
		case "Failed":
			return nil, errors.New("job failed")
		case "Cancelled":
			return nil, errors.New("job cancelled")
		case "Complete":
			return getQueryResultOutput, nil
		default:
			return nil, fmt.Errorf("unknown status: %s", *getQueryResultOutput.Status)
		}
	}
}
