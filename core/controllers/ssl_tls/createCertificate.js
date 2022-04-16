"use strict";
const { handleRequest } = require("../helpers");
const yup = require("yup");
const sslTlsService = require("../../db/models/ssl_tls_certificate_v2/ssl_tls_certificate.service");

yup.addMethod(yup.array, "unique", function (message, mapper = (a) => a) {
  return this.test("unique", message, function (list) {
    return list.length === new Set(list.map(mapper)).size;
  });
});

async function createCertificate(req, res) {
  const validationSchema = yup.object().shape({
    name: yup.string()
    .lowercase()
    .strict(),
    domainName: yup
      .string()
      .required("Please fill out this field")
      .test(
        "should-match-regex",
        "Only * or a combination of alphanumeric characters and the characters - and _ are allowed",
        function (value) {
          return /^([a-zA-Z0-9\-_]+|\*)$/g.test(value);
        }
      ),
    subjectAlternativeNames: yup
      .array()
      .of(
        yup.object().shape({
          name: yup
            .string()
            .required("Variable name is required")
            .test(
              "should-match-regex",
              "Only * or a combination of alphanumeric characters and the characters - and _ are allowed",
              function (value) {
                return /^([a-zA-Z0-9\-_]+|\*)$/g.test(value);
              }
            ),
        })
      )
      .unique("Duplicate name", (a) => a.name),
  });

  const handle = async () => {
    const { userId, environmentId } = res.locals;
    const { certificateIdentifier, version } = req.params;
    const { subjectAlternativeNames, region } = req.body;
    let { domainName } = req.body;

    domainName = domainName.toLowerCase();

    const isFirstVersion = req.params.certificateIdentifier ? false : true;
    const isUpdate = req.method === "PUT" ? true : false;

    return await sslTlsService.createCertificate(
      userId,
      environmentId,
      certificateIdentifier,
      version,
      isFirstVersion,
      isUpdate,
      domainName,
      subjectAlternativeNames,
      region
    );
  };
  await handleRequest({ req, res, validationSchema, handle });
}

exports.handler = createCertificate;
