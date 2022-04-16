// Note: this migration should not be applied, but it's just an example of how it works
// TODO: DELETE THIS file as soon as the first migration is added
module.exports = {
  async up(db, client) {
    // TODO write your migration here.
    // See https://github.com/seppevs/migrate-mongo/#creating-a-new-migration-script
    // Example:
    // await db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: true}});
    const apps = await db.collection('application_versions').find({ kind: 'ecs' }).toArray();
    const changes = apps.map(app => {

      return db.collection('application_versions').updateOne({ _id: app._id }, {
        $set: {
          serviceSettings: {
            desiredCount: app.taskDefinition.serviceDesiredCount,
            albId: app.dnsSettings.albId,
            ...(app.dnsSettings.certificate && { certificate: app.dnsSettings.certificate }),
            exposedAsPort: app.dnsSettings.exposedAsPort,
            containerToExpose: app.dnsSettings.containerToExpose,
            portToExpose: app.dnsSettings.portToExpose,
            clusterId: app.clusterId,
            healthChecks: {
              path: app.healthChecks.path,
              matcher: app.healthChecks.matcher
            },
            ...(app.rds && {
              rds: {
                id: app.rds.id,
                setAsVariable: app.rds.setAsVariable
              }
            })
          }
        }
      });
    });
    return Promise.all(changes);
  },

  async down(db, client) {
    // TODO write the statements to rollback your migration (if possible)
    // Example:
    // await db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: false}});
    const apps = await db.collection('application_versions').find({ kind: 'ecs' }).toArray();
    const changes = apps.map(app => {
      return db.collection('application_versions').updateOne({ _id: app._id }, {
        $unset: { serviceSettings: "" }
      });
    });
    return Promise.all(changes);
  }
};
