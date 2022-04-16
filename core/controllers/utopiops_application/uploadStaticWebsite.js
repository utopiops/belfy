const { handleRequest } = require('../helpers');
const utopiopsStaticWebsiteService = require('../../db/models/utopiops_application/staticWebsite.service');
const { defaultLogger: logger } = require('../../logger');
const constants = require('../../utils/constants');
const formidable = require('formidable');
const aws = require('aws-sdk');
const config = require('../../utils/config').config;
const {
  uniqueNamesGenerator,
  NumberDictionary,
  adjectives,
  animals,
} = require('unique-names-generator');
const Transform = require('stream').Transform;

aws.config.update({
  region: config.utopiopsProviderRegion,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const s3 = new aws.S3({
  apiVersion: '2006-03-01',
});

async function uploadStaticWebsite(req, res) {
  const handle = async () => {
    try {
      let uploaded = 0;
      let count = 0;
      let uploadError;

      // this generates a unique app name like : "jealous-kite-7185"
      // NOTE: check if this random name is already taken! (just to be sure)
      const appName =
        uniqueNamesGenerator({
          dictionaries: [adjectives, animals],
          separator: '-',
          length: 2,
        }) +
        '-' +
        NumberDictionary.generate({ length: 4 });

      const form = new formidable.IncomingForm({ maxFileSize: 5 * 1024 * 1024, multiples: true });
      const waitForUpload = new Promise((resolve, reject) => {
        let counter = 0;
        const interval = setInterval(async () => {
          try {
            counter += 2;
            if (count == uploaded) {
              if (uploadError) {
                clearInterval(interval);
                await utopiopsStaticWebsiteService.emptyBucket(
                  s3,
                  appName + config.staticWebsiteSubdomain + '/',
                );
                reject(uploadError);
              } else {
                clearInterval(interval);
                resolve('finished');
              }
            } else if (counter > 300) {
              // 5 minutes timeout
              clearInterval(interval);
              reject('failed');
            }
          } catch (err) {
            console.log('error while waiting for upload:', err);
            clearInterval(interval);
            reject('failed');
          }
        }, 2000);
      });

      form.parse(req, (err, fields, files) => {
        count = files.files.length || 1;
        let hasIndex;
        if (count === 1) {
          hasIndex = files.files.originalFilename.match(/^[^\/]+\/index.html$/);
        } else {
          hasIndex = files.files.some((file) =>
            file.originalFilename.match(/^[^\/]+\/index.html$/),
          );
        }
        if (err) {
          uploadError = err;
          return;
        }
        if (!hasIndex) {
          uploadError = new Error(`index.html file not found in root.`);
          return;
        }
      });
      // TODO: after adding zip file support, move all this to staticWebsite.service.js
      form.on('fileBegin', (name, file) => {
        // if (form.bytesExpected > 3 * 1024 * 1024) throw new Error('files size limit exceeded');
        file.on('error', (e) => this._error(e));

        file.open = function () {
          this._writeStream = new Transform({
            transform(chunk, encoding, callback) {
              callback(null, chunk);
            },
          });

          this._writeStream.on('error', (e) => this.emit('error', e));

          const filePath = this.originalFilename.split('/').slice(1).join('/');
          s3.upload(
            {
              Bucket: config.staticWebsiteBucket,
              Key: appName + config.staticWebsiteSubdomain + '/' + filePath,
              Body: this._writeStream,
              ContentType: this.mimetype, // <- this is important!
            },
            (err, data) => {
              console.log('upload data', data);
              console.log('upload err', err);
              uploaded++;
              if (err) logger.error(err);
            },
          );
        };

        file.end = function (cb) {
          this._writeStream.on('finish', () => {
            this.emit('end');
            cb();
          });
          this._writeStream.end();
        };
      });

      await waitForUpload;
      return await utopiopsStaticWebsiteService.uploadStaticWebsite(appName);
    } catch (error) {
      logger.error(`Error in uploading static website: ${error.message}`);
      return {
        error: {
          statusCode: error.httpCode || constants.statusCodes.badRequest,
          message: error.message,
        },
      };
    }
  };

  const extractOutput = (result) => result;

  return handleRequest({ req, res, handle, extractOutput });
}

exports.handler = uploadStaticWebsite;
