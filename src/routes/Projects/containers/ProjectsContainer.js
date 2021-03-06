import React, { Component, PropTypes } from 'react'
import { connect } from 'react-redux'
import { map } from 'lodash'
import {
  firebaseConnect,
  pathToJS,
  isLoaded,
  isEmpty,
  dataToJS,
  populatedDataToJS
} from 'react-redux-firebase'
import { devshare } from 'redux-devshare'
import LoadingSpinner from 'components/LoadingSpinner'
import SharingDialog from 'components/SharingDialog/SharingDialog'
import ProjectTile from '../components/ProjectTile/ProjectTile'
import NewProjectTile from '../components/NewProjectTile/NewProjectTile'
import NewProjectDialog from '../components/NewProjectDialog/NewProjectDialog'
import Devshare from 'devshare'

import classes from './ProjectsContainer.scss'

const populates = [
  { child: 'collaborators', root: 'users' }
]

@devshare()
@firebaseConnect(
  ({ params }) => ([
    'templates#limitToFirst=40',
    { path: `projects/${params.username}`, populates }
  ])
)
@connect(
  ({ firebase }, { params }) => ({
    projects: populatedDataToJS(firebase, `projects/${params.username}`, populates),
    templates: dataToJS(firebase, 'templates'),
    account: pathToJS(firebase, 'profile'),
    auth: pathToJS(firebase, 'auth')
  })
)
export default class Projects extends Component {

  static contextTypes = {
    router: React.PropTypes.object.isRequired
  }

  static propTypes = {
    account: PropTypes.object,
    projects: PropTypes.object,
    templates: PropTypes.object,
    firebase: PropTypes.object,
    devshare: PropTypes.object,
    auth: PropTypes.object,
    children: PropTypes.object,
    params: PropTypes.object,
    history: PropTypes.object
  }

  state = {
    addCollabModal: false,
    newProjectModal: false
  }

  toggleModal = (name, project) => {
    let newState = {}
    newState[`${name}Modal`] = !this.state[`${name}Modal`]
    if (project) {
      newState.currentProject = project
    }
    this.setState(newState)
  }

  newSubmit = newProject => {
    const { account } = this.props
    newProject.owner = account.username
    const args = [newProject]
    if (newProject.template) {
      args.unshift(newProject.template)
    }
    // call addFromTemplate method if template is selected
    const method = newProject.template ? 'addFromTemplate' : 'add'
    return Devshare
      .projects(account.username)[method](...args)
      .then(() => {
        this.toggleModal('newProject')
      })
      .catch(err => {
        // TODO: Show Snackbar
        console.error('error creating new project', err)
        this.toggleModal('newProject')
      })
  }

  // TODO: Delete through devshare projects method
  deleteProject = ({ name }) =>
    this.props.devshare
      .project(this.props.params.username, name)
      .delete()

  // TODO: Open based on project info instead of route param
  openProject = project =>
    this.context.router.push(`/${this.props.params.username}/${project.name}`)

  collabClick = user =>
    this.context.router.push(`/${user.username}`)

  render () {
    // TODO: Look into moving this into its own layer
    if (this.props.children) { return this.props.children }

    const { projects,
      account,
      params: { username },
      devshare,
      templates
    } = this.props
    const { newProjectModal, addCollabModal, currentProject } = this.state

    if (!isLoaded(projects)) {
      return <LoadingSpinner />
    }

    // User has no projects and doesn't match logged in user
    if (isEmpty(projects) && account && username !== account.username) {
      return (
        <div className={classes.container}>
          <div>This user has no projects</div>
        </div>
      )
    }

    const projectsList = map(projects, (project, i) => (
      <ProjectTile
        key={`Project-${i}`}
        project={project}
        onCollabClick={this.collabClick}
        onAddCollabClick={() => this.toggleModal('addCollab', project)}
        onSelect={this.openProject}
        onDelete={this.deleteProject}
      />
    ))

    // If username doesn't match route then hide add project tile
    if (account && account.username === username) {
      projectsList.unshift((
        <NewProjectTile
          key='Project-New'
          onClick={() => this.toggleModal('newProject')}
        />
      ))
    }

    return (
      <div className={classes.container}>
        {
          addCollabModal
          ? (
            <SharingDialog
              project={currentProject}
              open={addCollabModal}
              searchUsers={devshare.users().search}
              onAddCollab={devshare.project(currentProject).addCollaborator}
              onRemoveCollab={devshare.project(currentProject).removeCollaborator}
              onRequestClose={() => this.toggleModal('addCollab')}
            />
          ) : null
        }
        {
          newProjectModal
          ? (
            <NewProjectDialog
              open={newProjectModal}
              onSubmit={this.newSubmit}
              templates={templates}
              onRequestClose={() => this.toggleModal('newProject')}
            />
          ) : null
        }
        <div className={classes.tiles}>
          {projectsList}
        </div>
      </div>
    )
  }
}
