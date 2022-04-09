package job_log_contoller

import (
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-contrib/sse"

	"github.com/gin-gonic/gin"
	jlm "gitlab.com/utopiops-water/logstream-manager/models/job_log_model"
)

// How many cycles to wait while no new logs retrieved from database
const MAX_IDLE_CYCLES = 60

func (jlc *JobLogController) GetLog(jobLogStore jlm.JobLogStore) gin.HandlerFunc {
	return func(c *gin.Context) {

		var dto getLogDto
		if err := c.ShouldBindQuery(&dto); err != nil {
			fmt.Println(err.Error())
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		chanStream := make(chan []jlm.JobLog, 10)
		done := make(chan bool)
		go func() {
			defer close(chanStream)
			idleCycles := 0
			for idleCycles < MAX_IDLE_CYCLES {
				logs, err := jobLogStore.Retrieve(noContext, dto.JobId, dto.FromLineNumber)
				fmt.Println(logs)
				if err != nil {
					fmt.Println(err.Error())
					done <- true
					break
				}
				if l := len(logs); l == 0 {
					time.Sleep(time.Second)
					idleCycles++
					continue
				}
				lastLog := logs[len(logs)-1]
				if lastLog.IsLastLine {
					chanStream <- logs
					done <- true
					break
				}
				dto.FromLineNumber = lastLog.LineNumber + 1
				idleCycles = 0
				chanStream <- logs
				time.Sleep(time.Second * 1)
			}
			fmt.Println("No message for too long")
			done <- true
		}()
		count := 0
		c.Stream(func(w io.Writer) bool {
			for {
				select {
				case <-done:
					c.SSEvent("end", "end")
					return false
				case msg := <-chanStream:
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

type getLogDto struct {
	JobId          string `form:"jobId"          binding:"required"`
	FromLineNumber int16  `form:"fromLineNumber" default:"0"`
}
