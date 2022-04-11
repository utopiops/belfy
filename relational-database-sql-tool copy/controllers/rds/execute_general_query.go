package rds

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/awserr"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/lambda"
	"github.com/gin-gonic/gin"
	"gitlab.com/utopiops-water/relational-database-sql-tool/config"
	"gitlab.com/utopiops-water/relational-database-sql-tool/models"
	"gitlab.com/utopiops-water/relational-database-sql-tool/shared"
)

type RDSQuery struct {
	Username  string `json:"username"`
	Password  string `json:"password"`
	Database  string `json:"database"`
	Table     string `json:"table"`
	Statement string `json:"statement"`
}

type ExecuteGeneralQueryInputs struct {
	HttpHelper      shared.HttpHelper
	Context         *gin.Context
	Settings        *models.RDSSetting
	Query           RDSQuery
	AuthHeader      string
	EnvironmentName string
}

func ExecuteGeneralQuery(inputs ExecuteGeneralQueryInputs) {

	dto := inputs.Query

	// Get the provider credentials to be able to access CloudWatch
	var respDto struct {
		Credentials struct {
			AccessKeyId     string `json:"accessKeyId"`
			SecretAccessKey string `json:"secretAccessKey"`
		}
	}

	// Get the access token and url
	url := fmt.Sprintf("%s/v3/environment/name/%s/provider/credentials", config.Configs.Endpoints.Core, inputs.EnvironmentName)
	headers := []shared.Header{
		{
			Key:   "Authorization",
			Value: inputs.AuthHeader, // We just pass on the user's token
		},
	}
	idToken, err := inputs.Context.Cookie("id_token")
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
	out, err, statusCode, _ := inputs.HttpHelper.HttpRequest(http.MethodGet, url, nil, headers, 0)
	if err != nil || statusCode != http.StatusOK {
		inputs.Context.Status(http.StatusBadRequest)
		return
	}
	err = json.Unmarshal(out, &respDto)
	if err != nil {
		inputs.Context.Status(http.StatusInternalServerError)
		return
	}

	sess := session.Must(session.NewSessionWithOptions(session.Options{
		// TODO: Get the region from the core
		Config: aws.Config{Region: &inputs.Settings.Region, Credentials: credentials.NewStaticCredentials(respDto.Credentials.AccessKeyId, respDto.Credentials.SecretAccessKey, string(""))},
	}))

	lambdaEvent, err := json.Marshal(dto)
	if err != nil {
		inputs.Context.Status(http.StatusInternalServerError)
		return
	}

	svc := lambda.New(sess)
	input := &lambda.InvokeInput{
		FunctionName: &inputs.Settings.LambdaName,
		Payload:      lambdaEvent,
		// Qualifier:    aws.String("1"),
	}
	result, err := svc.Invoke(input)
	if err != nil {
		if aerr, ok := err.(awserr.Error); ok {
			switch aerr.Code() {
			case lambda.ErrCodeServiceException:
				fmt.Println(lambda.ErrCodeServiceException, aerr.Error())
			case lambda.ErrCodeResourceNotFoundException:
				fmt.Println(lambda.ErrCodeResourceNotFoundException, aerr.Error())
			case lambda.ErrCodeInvalidRequestContentException:
				fmt.Println(lambda.ErrCodeInvalidRequestContentException, aerr.Error())
			case lambda.ErrCodeRequestTooLargeException:
				fmt.Println(lambda.ErrCodeRequestTooLargeException, aerr.Error())
			case lambda.ErrCodeUnsupportedMediaTypeException:
				fmt.Println(lambda.ErrCodeUnsupportedMediaTypeException, aerr.Error())
			case lambda.ErrCodeTooManyRequestsException:
				fmt.Println(lambda.ErrCodeTooManyRequestsException, aerr.Error())
			case lambda.ErrCodeInvalidParameterValueException:
				fmt.Println(lambda.ErrCodeInvalidParameterValueException, aerr.Error())
			case lambda.ErrCodeEC2UnexpectedException:
				fmt.Println(lambda.ErrCodeEC2UnexpectedException, aerr.Error())
			case lambda.ErrCodeSubnetIPAddressLimitReachedException:
				fmt.Println(lambda.ErrCodeSubnetIPAddressLimitReachedException, aerr.Error())
			case lambda.ErrCodeENILimitReachedException:
				fmt.Println(lambda.ErrCodeENILimitReachedException, aerr.Error())
			case lambda.ErrCodeEFSMountConnectivityException:
				fmt.Println(lambda.ErrCodeEFSMountConnectivityException, aerr.Error())
			case lambda.ErrCodeEFSMountFailureException:
				fmt.Println(lambda.ErrCodeEFSMountFailureException, aerr.Error())
			case lambda.ErrCodeEFSMountTimeoutException:
				fmt.Println(lambda.ErrCodeEFSMountTimeoutException, aerr.Error())
			case lambda.ErrCodeEFSIOException:
				fmt.Println(lambda.ErrCodeEFSIOException, aerr.Error())
			case lambda.ErrCodeEC2ThrottledException:
				fmt.Println(lambda.ErrCodeEC2ThrottledException, aerr.Error())
			case lambda.ErrCodeEC2AccessDeniedException:
				fmt.Println(lambda.ErrCodeEC2AccessDeniedException, aerr.Error())
			case lambda.ErrCodeInvalidSubnetIDException:
				fmt.Println(lambda.ErrCodeInvalidSubnetIDException, aerr.Error())
			case lambda.ErrCodeInvalidSecurityGroupIDException:
				fmt.Println(lambda.ErrCodeInvalidSecurityGroupIDException, aerr.Error())
			case lambda.ErrCodeInvalidZipFileException:
				fmt.Println(lambda.ErrCodeInvalidZipFileException, aerr.Error())
			case lambda.ErrCodeKMSDisabledException:
				fmt.Println(lambda.ErrCodeKMSDisabledException, aerr.Error())
			case lambda.ErrCodeKMSInvalidStateException:
				fmt.Println(lambda.ErrCodeKMSInvalidStateException, aerr.Error())
			case lambda.ErrCodeKMSAccessDeniedException:
				fmt.Println(lambda.ErrCodeKMSAccessDeniedException, aerr.Error())
			case lambda.ErrCodeKMSNotFoundException:
				fmt.Println(lambda.ErrCodeKMSNotFoundException, aerr.Error())
			case lambda.ErrCodeInvalidRuntimeException:
				fmt.Println(lambda.ErrCodeInvalidRuntimeException, aerr.Error())
			case lambda.ErrCodeResourceConflictException:
				fmt.Println(lambda.ErrCodeResourceConflictException, aerr.Error())
			case lambda.ErrCodeResourceNotReadyException:
				fmt.Println(lambda.ErrCodeResourceNotReadyException, aerr.Error())
			default:
				fmt.Println(aerr.Error())
			}
		} else {
			// Print the error, cast err to awserr.Error to get the Code and
			// Message from an error.
			fmt.Println(err.Error())
		}
		inputs.Context.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var converted interface{}
	json.Unmarshal(result.Payload, &converted)
	resp, ok := converted.(map[string]interface{})
	if ok {
		if _, ok := resp["error"]; ok {
			errorResp := resp["error"].(map[string]interface{})
			inputs.Context.JSON(http.StatusBadRequest, gin.H{
				"errorMessage": errorResp["message"],
			})
			return
		} else if _, ok := resp["errorMessage"]; ok {
			inputs.Context.JSON(http.StatusBadRequest, gin.H{
				"errorMessage": resp["errorMessage"],
			})
			return
		}
	}
	inputs.Context.JSON(http.StatusOK, converted)

}
