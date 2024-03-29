import PropTypes from 'prop-types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteEntity, getEntities } from '../api/base'
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

  const queryClient = useQueryClient()

  const { data: entities, isLoading } = useQuery({
    queryKey: [name?.toLowerCase()],
    queryFn: async () => {
      const resp = await getEntities(name)
      return resp.data
    },
  })

  const { mutate } = useMutation({
    mutationFn: async ({id}) =>  await deleteEntity(name, id),
    onError: (e) => alert(`Oops! `, e.message),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: [name?.toLowerCase()]})
    },
  })

  if (isLoading) {
    return <p>Loading...</p>
  }

  return (
    <>
      <h1>{name} list</h1>
      <section>
        <div>
          <Link className="create-button" to={`/${name}/new`}>
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
                      {/* TODO: show confirmation modal */}
                      <button className="btn-danger" onClick={() => mutate({id: e.id})}>
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
    </>
  )
}
