package cloudwatch

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/cloudwatchlogs"
	"github.com/gin-contrib/sse"
	"github.com/gin-gonic/gin"
	"gitlab.com/utopiops-water/log-integration/config"
	"gitlab.com/utopiops-water/log-integration/shared"
	"gitlab.com/utopiops-water/log-integration/stores"
)

func (controller *CloudwatchController) GetLiveLogs(httpHelper shared.HttpHelper, settingsStore stores.SettingsStore) gin.HandlerFunc {
	return func(c *gin.Context) {

		var dto struct {
			LogGroupName string `json:"logGroupName"`
		}

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
			// Config: aws.Config{Region: aws.String("us-east-1"), Credentials: credentials.NewStaticCredentials(respDto.Credentials.AccessKeyId, respDto.Credentials.SecretAccessKey, string(""))},
			Config: aws.Config{Region: &settings.Region, Credentials: credentials.NewStaticCredentials(respDto.Credentials.AccessKeyId, respDto.Credentials.SecretAccessKey, string(""))},
		}))

		svc := cloudwatchlogs.New(sess)
		resultsStream := make(chan []*cloudwatchlogs.ResultField, 10)

		// This context controls the overall execution of getting logs and sending the events. We intentionally stop the log stream after a duration.
		ctx, _ := context.WithTimeout(context.Background(), time.Duration(120)*time.Second)

		errors := make(chan error, 1)

		go getLogs(ctx, &dto.LogGroupName, errors, svc, resultsStream)

		count := 0
		c.Stream(func(w io.Writer) bool {
			for {
				select {
				case <-ctx.Done():
					c.SSEvent("end", "end")
					return false
				case <-errors:
					c.SSEvent("end", "end")
					return true
				case msg, ok := <-resultsStream:
					if !ok {
						c.SSEvent("end", "end")
						return false
					}
					c.Render(-1, sse.Event{
						Id:    strconv.Itoa(count),
						Event: "message",
						Data:  msg,
					})
					count++
					return true
				}
			}
		})

	}

}

func sendEvents(c *gin.Context, errors <-chan error, results <-chan *cloudwatchlogs.GetQueryResultsOutput) {

}

func getLogs(ctx context.Context, logGroupName *string, errorsChan chan error, svc *cloudwatchlogs.CloudWatchLogs, results chan []*cloudwatchlogs.ResultField) {
	defer close(results)
	for {
		perQueryCtx, cancel := context.WithTimeout(context.Background(), time.Duration(40)*time.Second)

		input := cloudwatchlogs.StartQueryInput{
			LogGroupName: logGroupName,
			Limit:        aws.Int64(10),
			StartTime:    aws.Int64(time.Now().Add(time.Duration(-5) * time.Minute).Unix()),
			EndTime:      aws.Int64(time.Now().Unix()),
			QueryString:  aws.String("fields toMillis(@timestamp) as timestamp, @message"),
		}

		if err := input.Validate(); err != nil {
			// c.Status(http.StatusInternalServerError)
			errorsChan <- err
			cancel()
			return
		}

		req, startQueryOutput := svc.StartQueryRequest(&input)

		err := req.Send()
		if err != nil {
			fmt.Println(err.Error())
			errorsChan <- err
			cancel()
			return
		}

		queryResults := make(chan *cloudwatchlogs.GetQueryResultsOutput)
		queryErrors := make(chan error)

		go getQueryResultsUntilComplete(perQueryCtx, svc, *startQueryOutput.QueryId, 10, queryResults, queryErrors)
		// resultsOutput, err := getQueryResultsUntilComplete(svc, *startQueryOutput.QueryId, 10)
		// if err != nil {
		// 	errorsChan <- err
		// 	return
		// }
		// // results <- resultsOutput
		// for _, rs := range resultsOutput.Results {
		// 	results <- rs
		// 	// for _, v := range rs {
		// 	// 	fmt.Printf("field=%s, value=%s\n", *v.Field, *v.Value)
		// 	// }
		// }
		select {
		case <-ctx.Done():
			cancel()
			break
		case <-perQueryCtx.Done():
			errorsChan <- errors.New("Query timed out")
			break
		case err := <-queryErrors:
			errorsChan <- err
		case queryResult := <-queryResults:
			for _, rs := range queryResult.Results {
				results <- rs
			}
			continue
		}
	}
}

func getQueryResultsUntilComplete(ctx context.Context, cwl *cloudwatchlogs.CloudWatchLogs, queryId string, limit int, results chan *cloudwatchlogs.GetQueryResultsOutput, errorsChan chan error) {
	getQueryResultInput := &cloudwatchlogs.GetQueryResultsInput{}
	getQueryResultInput.SetQueryId(queryId)
	for {
		getQueryResultOutput, err := cwl.GetQueryResultsWithContext(ctx, getQueryResultInput)
		if err != nil {
			errorsChan <- err
			return
		}
		time.Sleep(5 * time.Second)
		switch *getQueryResultOutput.Status {
		case "Running":
			if len(getQueryResultOutput.Results) < limit {
				continue
			}
			stopQueryInput := &cloudwatchlogs.StopQueryInput{}
			stopQueryInput.SetQueryId(queryId)
			stopResult, err := cwl.StopQuery(stopQueryInput)
			if err != nil {
				errorsChan <- fmt.Errorf("stop query error=%s status=%v", err.Error(), stopResult)
				return
			}
			results <- getQueryResultOutput
			close(results)
			return
		case "Scheduled":
			continue
		case "Failed":
			errorsChan <- errors.New("job failed")
			return
		case "Cancelled":
			errorsChan <- errors.New("job cancelled")
			return
		case "Complete":
			results <- getQueryResultOutput
			close(results)
			return
		default:
			errorsChan <- fmt.Errorf("unknown status: %s", *getQueryResultOutput.Status)
			return
		}
	}
}
