function controllerFactory(Model) {
  return {
    async getAll(req, res) {
      try {
        const entities = await Model.findAll({ raw: true });
        res.json(entities);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    },

    async getById(req, res) {
      const { id } = req.params;
      try {
        const entity = await Model.findByPk(id, { raw: true });
        if (!entity) {
          return res.status(404).json({ error: `${Model.name} not found` });
        }
        res.json(entity);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    },

    async create(req, res) {
      const data = req.body;
      try {
        const entity = await Model.create(data);
        res.status(201).json(entity);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    },

    async update(req, res) {
      const { id } = req.params;
      const data = req.body;
      try {
        const entity = await Model.findByPk(id);
        if (!entity) {
          return res.status(404).json({ error: `${Model.name} not found` });
        }
        await entity.update(data);
        res.json(entity);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    },

    async delete(req, res) {
      const { id } = req.params;
      try {
        const entity = await Model.findByPk(id);
        if (!entity) {
          return res.status(404).json({ error: `${Model.name} not found` });
        }
        await entity.destroy();
        res.sendStatus(204);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  };
}

module.exports = controllerFactory;
