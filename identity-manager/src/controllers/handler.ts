// import constants from '../../constants';
import { Request, Response } from 'express';
import constants from '../utils/constants';

async function handleRequest({
  req,
  res,
  handle,
  validationSchema,
  extractOutput,
}: {
  req: Request;
  res: Response;
  handle: () => Promise<{ outputs?: any; error?: { message: string; statusCode?: number } }>;
  validationSchema?: any;
  extractOutput?: (outputs: any) => any;
}) {
  if (validationSchema) {
    try {
      validationSchema.validateSync(req.body);
    } catch (error: any) {
      res.status(constants.statusCodes.ue).send({ message: error.message });
      return;
    }
  }
  try {
    const result = await handle();
    console.log('result', result);

    if (result.error) {
      res.status(result.error.statusCode || constants.statusCodes.ise).send({ message: result.error.message });
      return;
    }

    if (extractOutput) {
      res.status(constants.statusCodes.ok).send(await extractOutput(result.outputs));
      return;
    }
    res.sendStatus(constants.statusCodes.ok);
  } catch (error) {
    console.error('error:', error);
    res.sendStatus(constants.statusCodes.ise);
  }
}

export default handleRequest;
