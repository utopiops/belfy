import { Link } from 'react-router-dom'
import PropTypes from 'prop-types'

Navbar.propTypes = {
  entities: PropTypes.arrayOf(PropTypes.string),
}

export function Navbar({ entities }) {
  console.log(`en`, entities);
  return (
    <nav>
      <ul className="navbar">
        {entities?.map((entity) => {
          return (
            <li key={entity}>
              <Link to={`/${entity}`}>{entity}</Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
