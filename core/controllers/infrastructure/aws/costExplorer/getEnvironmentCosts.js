const { handleRequest } = require("../../../helpers");
const { getCostExplorer } = require("./getCostExplorer");
const { handleAwsRequest } = require("../helpers");
const yup = require('yup');

async function getEnvironmentCosts(req, res) {
  const validationSchema = yup.object().shape({
    Granularity: yup.string().required(),
    TimePeriod: yup.object().shape({
      Start: yup.string().required(),
      End: yup.string().required()
    })
  });
  const handle = async () => {
    const baseConfig = {
      credentials: res.locals.credentials,
      region: 'us-east-1'
    };
    const { Granularity, TimePeriod } = req.body;
    const { environmentName } = req.params;
    const costExplorer = await getCostExplorer(baseConfig);
    const Filter = {
      Tags: {
        Key: 'UTOPIOPS_ENVIRONMENT',
        Values: [environmentName]
      }
    }

    const params = {
      Granularity,
      TimePeriod,
      Metrics: ['BlendedCost'],
      Filter,
      GroupBy: [{
        Type: 'DIMENSION',
        Key: 'SERVICE'
      }]
    }

    const fn = () => costExplorer.getCostAndUsage(params).promise();
    return await handleAwsRequest({ fn });
  };
  const extractOutput = async (outputs) => {
    let timePeriods = []
    outputs.ResultsByTime.forEach(output => {
      if(output.Total.BlendedCost == undefined) {
        let item = {}
        item.TimePeriod = output.TimePeriod
        let temp = []
        let total = 0
        output.Groups.forEach(group => {
          let obj = {
            Category: group.Keys[0],
            ...group.Metrics.BlendedCost
          }
          total += parseFloat(obj.Amount)
          temp.push(obj)
        })
        item.Values = temp
        item.Total = total
        timePeriods.push(item)
      }
    })

    let result = []
    let unit
    timePeriods.forEach(timePeriod => {
      // Sort the values by their amount
      timePeriod.Values.sort((a, b) => Math.abs(a.Amount) > Math.abs(b.Amount) ? -1 : 1)

      let values = []
      let othersAmount = 0
      for(let i=0; i<timePeriod.Values.length; i++) {
        const item = timePeriod.Values[i]
        if(i < 6) {
          unit = item.Unit
          if(item.Amount != 0) {
            values.push(item)
          }
        } else {
          console.log('Should add ', parseFloat(item.Amount))
          othersAmount += parseFloat(item.Amount)
        }
      }
      
      console.log('Others amount', othersAmount)
      if(othersAmount != 0) {
        let otherObj = {
          Category: 'Others',
          Amount: othersAmount,
          Unit: unit
        }
        values.push(otherObj)
      }
      result.push({
        TimePeriod: timePeriod.TimePeriod, 
        Values: values,
        Total: timePeriod.Total
      })
    })

    return result
  }
  await handleRequest({ req, res, validationSchema, extractOutput, handle });
}

exports.handler = getEnvironmentCosts;