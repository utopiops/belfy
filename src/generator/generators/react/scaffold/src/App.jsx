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
      <Navbar entities={Object.keys(entities)} />
      <div>{children}</div>
    </div>
  )
}

function Router() {
  return (
    <Routes>
      {Object.keys(entities).map((k) => {
        return (
          <React.Fragment key={k}>
            <Route path={`/${k.toLocaleLowerCase()}`} element={<ListEntities name={k} properties={entities[k]} />} />
            <Route path={`/${k.toLocaleLowerCase()}/new`} element={<AddEntity name={k} properties={entities[k]} />} />
            <Route
              path={`/${k.toLocaleLowerCase()}/edit/:id`}
              element={<EditEntity name={k} properties={entities[k]} />}
            />
          </React.Fragment>
        )
      })}
    </Routes>
  )
}

export default App
