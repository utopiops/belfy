import PropTypes from 'prop-types'
import { useQuery } from '@tanstack/react-query'
import { getEntities } from '../api/base'
import { Link } from 'react-router-dom'
import React from 'react'

ListEntities.propTypes = {
  name: PropTypes.string,
  properties: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      type: PropTypes.string, //not supported currently
    }),
  ),
}

export default function ListEntities({ name, properties }) {
  const { data: entities, isLoading } = useQuery({
    queryKey: [name.toLowerCase()],
    queryFn: async () => {
      const resp = await getEntities(name)
      return resp.data
    },
  })

  if (isLoading) {
    return <p>Loading...</p>
  }

  console.log(`entities: `, JSON.stringify(entities, null, 2))
  return (
    <>
      <h1>{name} list</h1>
      <section>
        <div>
          <Link className="create-button" href="/${entity.name.toLowerCase()}/new">
            + Create
          </Link>
        </div>
        <div className="table">
          <div className="table-header">
            {properties.map((p) => {
              return <div key={p.name}>{p.name}</div>
            })}
            <div>Actions</div>
          </div>
          <div className="table-body">
            {entities?.map((e, i) => {
              return (
                <React.Fragment key={i}>
                  <div key={i} className="table-row">
                    {properties.map((p) => {
                      return <div key={p.name}>{e[p.name]}</div>
                    })}
                    <div className="actions">
                      <Link to={`/${name}/edit/${e.id}`}>Edit</Link>
                      <button className="btn-danger" onClick={() => {}}>
                        Delete
                      </button>
                    </div>
                  </div>
                </React.Fragment>
              )
            })}
          </div>
        </div>
      </section>
      {/* <script>
    function confirmDelete(id) {
        if (confirm('Are you sure you want to delete this ${entity.name}?')) {
            // Send delete request to the server
            fetch('/${entity.name.toLowerCase()}/' + id, {
                method: 'DELETE'
            })
            .then(response => {
                if (response.ok) {
                    // Reload the page after successful deletion
                    location.reload();
                } else {
                    throw new Error('Failed to delete ${entity.name}');
                }
            })
            .catch(error => {
                console.error(error);
                alert('Failed to delete ${entity.name}. Please try again later.');
            });
        }
    }
</script> */}
    </>
  )
}
