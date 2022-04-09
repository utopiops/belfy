exports.getUserFromJobDetails = (jobDetails) => {
  const accountId = jobDetails.accountId;
  const userId = jobDetails.userId;
  return { id: userId, accountId };
}