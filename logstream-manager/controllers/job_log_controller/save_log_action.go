package job_log_contoller

import (
	"context"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	jlm "gitlab.com/utopiops-water/logstream-manager/models/job_log_model"
)

var noContext = context.Background()

func (jlc *JobLogController) SaveLog(jobLogStore jlm.JobLogStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		var dto logDto
		if err := c.ShouldBindJSON(&dto); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		// TODO: Add validation

		jobLog := jlm.JobLog{
			JobId:      dto.JobId,
			LineNumber: dto.LineNumber,
			Payload:    dto.Payload,
			IsLastLine: dto.IsLastLine,
		}

		err := jobLogStore.Create(noContext, &jobLog)
		if err != nil {
			fmt.Println(err.Error())
			c.Status(http.StatusInternalServerError)
			return
		}
		c.Status(http.StatusOK)
	}
}

type logDto struct {
	JobId      string `json:"jobId"`
	LineNumber int16  `json:"lineNumber"`
	Payload    string `json:"payload"`
	IsLastLine bool   `json:"isLastLine"`
}
