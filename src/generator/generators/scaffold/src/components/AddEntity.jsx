import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import PropTypes from 'prop-types'
import { Navigate } from 'react-router-dom'
import { addEntity } from '../api/base'

AddEntity.propTypes = {
  name: PropTypes.string,
  properties: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      type: PropTypes.string, //not supported currently
    }),
  ),
}

export function AddEntity({ name, properties }) {
  const { register, handleSubmit } = useForm()

  const { mutate, isSuccess } = useMutation({
    mutationFn: (values) => addEntity(name, values),
    onError: (e) => alert(`Oops! `, e.message),
  })

  if (isSuccess) {
    return <Navigate to={`/${name}`} />
  }

  return (
    <>
      <h1>Add {name}</h1>
      <form onSubmit={handleSubmit(mutate)}>
        {properties?.map((p) => {
          return (
            <div key={p.name} className="form-group">
              <label htmlFor={p.name}>{p.name}:</label>
              <input type="text" {...register(p.name)} className="form-control" required />
            </div>
          )
        })}
        <button type="submit">Create</button>
      </form>
    </>
  )
}
