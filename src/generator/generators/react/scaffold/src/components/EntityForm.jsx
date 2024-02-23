import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import PropTypes from 'prop-types'
import { Navigate, useParams } from 'react-router-dom'
import { getEntity, addEntity, updateEntity } from '../api/base'

EntityForm.propTypes = {
  name: PropTypes.string,
  id: PropTypes.string,
  defaultValues: PropTypes.any,
  submitSuccess: PropTypes.func,
  properties: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      type: PropTypes.string, //not supported currently
    }),
  ),
}

AddEntity.propTypes = {
  name: PropTypes.string,
  properties: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      type: PropTypes.string, //not supported currently
    }),
  ),
}

EditEntity.propTypes = {
  name: PropTypes.string,
  properties: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      type: PropTypes.string, //not supported currently
    }),
  ),
}

export function AddEntity({ name, properties }) {
  return <EntityForm name={name} properties={properties} />
}

export function EditEntity({ name, properties }) {
  const { id } = useParams()
  const queryClient = useQueryClient()

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: [`${name?.toLowerCase()}-${id}`] })
  }

  const { data, isLoading } = useQuery({
    queryKey: [`${name?.toLowerCase()}-${id}`],
    queryFn: async () => {
      const resp = await getEntity(name, id)
      return resp.data
    },
  })

  if (isLoading) {
    return <p>Loading...</p>
  }

  return (
    <EntityForm name={name} properties={properties} id={id} defaultValues={data} submitSuccess={invalidateQueries} />
  )
}

function EntityForm({ name, properties, id, defaultValues = {}, submitSuccess = () => {} }) {
  const isEdit = !!id
  const title = isEdit ? `Edit ${name}:${id}` : `Add new ${name}`
  const mutationFn = isEdit ? (values) => updateEntity(name, id, values) : (values) => addEntity(name, values)

  const { register, handleSubmit } = useForm({
    defaultValues,
  })

  const { mutate, isSuccess } = useMutation({
    mutationFn,
    onError: (e) => alert(`Oops! `, e.message),
    onSuccess: submitSuccess,
  })

  if (isSuccess) {
    return <Navigate to={`/${name}`} />
  }

  return (
    <>
      <h1>{title}</h1>
      <form onSubmit={handleSubmit(mutate)}>
        {properties?.map((p) => {
          return (
            <div key={p.name} className="form-group">
              <label htmlFor={p.name}>{p.name}:</label>
              <input type="text" {...register(p.name)} className="form-control" />
            </div>
          )
        })}
        <button type="submit">{isEdit ? 'Update' : 'Create' }</button>
      </form>
    </>
  )
}
