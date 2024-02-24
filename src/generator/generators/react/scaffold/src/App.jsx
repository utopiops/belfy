import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import PropTypes from 'prop-types'

import ListEntities from './components/ListEntities'
import { entities } from './entities'
import { AddEntity, EditEntity } from './components/EntityForm'
import React from 'react'
import { Navbar } from './components/Navbar'

function App() {
  const queryClient = new QueryClient()
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <Layout>
          <Router />
        </Layout>
      </QueryClientProvider>
    </BrowserRouter>
  )
}

Layout.propTypes = {
  children: PropTypes.object,
}

function Layout({ children }) {
  return (
    <div className="text-slate-700">
      <Navbar entities={entities.map(e => e.name)} />
      <div>{children}</div>
    </div>
  )
}

function Router() {
  return (
    <Routes>
      {entities.map((e) => {
        return (
          <React.Fragment key={e.name}>
            <Route path={`/${e.name.toLocaleLowerCase()}`} element={<ListEntities name={e.name} properties={e.properties} />} />
            <Route path={`/${e.name.toLocaleLowerCase()}/new`} element={<AddEntity name={e.name} properties={e.properties} />} />
            <Route
              path={`/${e.name.toLocaleLowerCase()}/edit/:id`}
              element={<EditEntity name={e.name} properties={e.properties} />}
            />
          </React.Fragment>
        )
      })}
    </Routes>
  )
}

export default App
