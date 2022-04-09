package services

type IJobService interface {
	GetJobStatus(jobId string) (string, error)
}

type JobService struct {
}

func (js *JobService) GetJobStatus(jobId string) (string, error) {
	return "done", nil
}

// client := &http.Client{
// 	CheckRedirect: redirectPolicyFunc,
// }

// resp, err := client.Get("http://example.com")
// // ...

// req, err := http.NewRequest("GET", "http://example.com", nil)
// // ...
// req.Header.Add("If-None-Match", `W/"wyzzy"`)
// resp, err := client.Do(req)
