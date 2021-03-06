import React, { Component, PropTypes } from 'react'
import FlatButton from 'material-ui/FlatButton'
import Dialog from 'material-ui/Dialog'
import { List, ListItem } from 'material-ui/List'
import AutoComplete from 'material-ui/AutoComplete'
import Avatar from 'material-ui/Avatar'
import PersonIcon from 'material-ui/svg-icons/social/person'
import RemoveIcon from 'material-ui/svg-icons/content/remove-circle'
import { red500, red800 } from 'material-ui/styles/colors'
import classes from './SharingDialog.scss'
import { map, size } from 'lodash'

export default class SharingDialog extends Component {
  state = {
    error: null
  }

  static propTypes = {
    project: PropTypes.object.isRequired,
    open: PropTypes.bool, // react/no-unused-prop-types
    error: PropTypes.object,
    onRequestClose: PropTypes.func,
    searchUsers: PropTypes.func.isRequired,
    onAddCollab: PropTypes.func.isRequired,
    onRemoveCollab: PropTypes.func.isRequired
  }

  searchAccounts = q =>
    this.props.searchUsers(q)
      .then(matchingUsers =>
        this.setState({
          matchingUsers: map(matchingUsers, (user, key) =>
            Object.assign(user, { key })
          )
        })
      )
      // TODO: Show snack for error
      .catch(error => this.setState({ error }))

  selectNewCollab = username => {
    this.props.onAddCollab(username)
    this.setState({ searchText: '' })
  }

  removeCollab = ind => {
    this.props.onRemoveCollab(this.props.project.collaborators[ind].username)
  }

  close = () => {
    this.setState({ searchText: '' })
    this.props.onRequestClose()
  }

  render () {
    const { project, error, onRequestClose } = this.props
    const { matchingUsers, searchText } = this.state

    const actions = [
      <FlatButton
        label='Close'
        secondary
        onClick={onRequestClose}
        onTouchTap={onRequestClose}
      />
    ]

    const matchingUsernames = matchingUsers
      ? matchingUsers.map(account =>
          account.username ? account.username : account
        )
      : []

    return (
      <Dialog
        {...this.props}
        title='Sharing'
        actions={actions}
        modal={false}
        bodyClassName={classes.body}
        titleClassName={classes.title}
        contentClassName={classes.container}
      >
        {
          error
          ? (
            <div className={classes.error}>
              <span>{error}</span>
            </div>
          )
          : null
        }
        {
          size(project.collaborators)
            ? (
              <List>
                {
                  map(project.collaborators, ({ avatarUrl, username }, i) => (
                    <ListItem
                      key={`${project.name}-Collab-${i}`}
                      leftAvatar={
                        <Avatar
                          icon={<PersonIcon />}
                          src={avatarUrl}
                        />
                      }
                      rightIcon={
                        <RemoveIcon
                          color={red500}
                          hoverColor={red800}
                          onClick={() => this.removeCollab(i)}
                        />
                      }
                      primaryText={username}
                      secondaryText='Read, Write'
                    />
                 ))
                }
              </List>
            )
            : (
              <div className={classes['no-collabs']}>
                <span>No current collaborators</span>
              </div>
            )
        }
        <div className={classes['search-container']}>
          <AutoComplete
            className={classes.search}
            hintText='Search users to add'
            floatingLabelText='Search users to add'
            fullWidth
            searchText={searchText}
            dataSource={matchingUsernames}
            onUpdateInput={this.searchAccounts}
            onNewRequest={this.selectNewCollab}
          />
        </div>
      </Dialog>
    )
  }
}
