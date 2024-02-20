function controllerFactory(Model) {
  return {
    async getAll(req, res) {
      try {
        const entities = await Model.findAll({ raw: true });
        res.render(`${Model.name}-list`, { name: Model.name, entities });
      } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
      }
    },

    async getById(req, res) {
      const { id } = req.params;
      try {
        const entity = await Model.findByPk(id, { raw: true });
        if (!entity) {
          return res.status(404).send(`${Model.name} not found`);
        }
        res.render('details', { entity });
      } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
      }
    },

    renderCreateForm(req, res) {
      res.render(`${Model.name}-add-form`);
    },
    
    async renderEditForm(req, res) {
      const { id } = req.params;
      try {
        const entity = await Model.findByPk(id, { raw: true });
        if (!entity) {
          return res.status(404).send(`${Model.name} not found`);
        }
        res.render(`${Model.name}-edit-form`, { entity});
      } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
      }

    },

    async create(req, res) {
      const data = req.body;
      try {
        const entity = await Model.create(data);
        res.redirect(`/${Model.name.toLowerCase()}`);
      } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
      }
    },

    async update(req, res) {
      const { id } = req.params;
      const data = req.body;
      try {
        const entity = await Model.findByPk(id);
        if (!entity) {
          return res.status(404).send(`${Model.name} not found`);
        }
        await entity.update(data);
        res.redirect(`/${Model.name.toLowerCase()}`);
      } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
      }
    },

    async delete(req, res) {
      const { id } = req.params;
      try {
        const entity = await Model.findByPk(id);
        if (!entity) {
          return res.status(404).send(`${Model.name} not found`);
        }
        await entity.destroy();
        res.sendStatus(200);
      } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
      }
    }
  };
}

module.exports = controllerFactory;
