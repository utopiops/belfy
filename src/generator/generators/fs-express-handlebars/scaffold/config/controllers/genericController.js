function generateGenericController(Model, schema) {
  return {
    async getAll(req, res) {
      try {
        const entities = await Model.findAll();
        res.render('list', { entities, schema });
      } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
      }
    },

    async getById(req, res) {
      const { id } = req.params;
      try {
        const entity = await Model.findByPk(id);
        if (!entity) {
          return res.status(404).send(`${Model.name} not found`);
        }
        res.render('details', { entity, schema });
      } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
      }
    },

    // Render the form for creating a new entity
    renderCreateForm(req, res) {
      res.render('create');
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

    // Render the form for updating an existing entity
    async renderUpdateForm(req, res) {
      const { id } = req.params;
      try {
        const entity = await Model.findByPk(id);
        if (!entity) {
          return res.status(404).send(`${Model.name} not found`);
        }
        res.render('update', { entity, schema });
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
        res.redirect(`/${Model.name.toLowerCase()}`);
      } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
      }
    }
  };
}

module.exports = generateGenericController;
