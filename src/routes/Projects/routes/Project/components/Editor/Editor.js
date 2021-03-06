import React, { PropTypes, Component } from 'react'
import { devshare } from 'redux-devshare'

import { connect } from 'react-redux'
import { pathToJS, firebaseConnect } from 'react-redux-firebase'
import classes from './Editor.scss'
require('codemirror/lib/codemirror.css')
require('codemirror/theme/monokai.css')

@firebaseConnect()
@devshare()
@connect(
  // Map state to props
  ({ firebase }) => ({
    account: pathToJS(firebase, 'profile')
  })
)
export default class Editor extends Component {
  static propTypes = {
    mode: PropTypes.string,
    account: PropTypes.shape({
      username: PropTypes.string.isRequired
    }),
    firebase: PropTypes.shape({
      ref: PropTypes.func.isRequired
    }),
    devshare: PropTypes.object,
    theme: PropTypes.string,
    name: PropTypes.string.isRequired,
    height: PropTypes.string,
    width: PropTypes.string,
    showGutter: PropTypes.bool,
    value: PropTypes.string,
    maxLines: PropTypes.number,
    readOnly: PropTypes.bool,
    highlightActiveLine: PropTypes.bool,
    showPrintMargin: PropTypes.bool,
    filePath: PropTypes.string.isRequired,
    project: PropTypes.object.isRequired,
    vimEnabled: PropTypes.bool
  }

  static defaultProps = {
    name: 'editor',
    mode: 'javascript',
    theme: 'monokai',
    value: '',
    fontSize: 12,
    showGutter: true,
    maxLines: null,
    readOnly: false,
    highlightActiveLine: true,
    showPrintMargin: true
  }

  firepad = {}

  componentWillUnmount () {
    this.handleDispose()
  }

  componentDidMount () {
    let CodeMirror = require('codemirror')
    require('expose?CodeMirror!codemirror') // Needed for Firepad to load CodeMirror
    require('codemirror/keymap/vim')
    require('codemirror/mode/javascript/javascript')
    require('codemirror/mode/css/css')
    require('codemirror/mode/jsx/jsx')
    require('codemirror/mode/htmlmixed/htmlmixed')
    require('codemirror/mode/go/go')
    require('codemirror/mode/yaml/yaml')
    // require('codemirror/mode/pug/pug')
    require('codemirror/mode/markdown/markdown')
    require('codemirror/mode/sass/sass')
    require('codemirror/mode/shell/shell')
    require('codemirror/mode/clike/clike')
    require('codemirror/mode/xml/xml')
    const editorDiv = document.getElementById(this.props.name)
    const { name, owner } = this.props.project
    const file = this.props.devshare.project(owner, name).fileSystem.file(this.props.filePath)
    this.editor = CodeMirror(editorDiv, {
      lineNumbers: true,
      lineWrapping: true,
      mode: `${file.syntaxMode || 'javascript'}`
    })
    this.editor.setOption('theme', 'monokai')
    // CodeMirror.Vim.map('jj', '<Esc>', 'insert')
    // //TODO: add read only for collabs
    // this.editor.setOption('readOnly', this.props.readOnly);
    this.handleLoad(this.editor)
  }

  componentWillReceiveProps (nextProps) {
    if (this.editor) {
      // TODO: Check to see if this is nessesary
      this.handleLoad(this.editor)
      nextProps.vimEnabled ? this.enableVim() : this.disableVim()
    }
  }

  handleLoad = (editor) => {
    // Load file content
    const Firepad = require('firepad')
    const { project: { name, owner }, account } = this.props

    if (typeof editor.firepad === 'undefined') {
      const { fileSystem } = this.props.devshare.project(owner, name)
      const file = fileSystem.file(this.props.filePath)
      try {
        try {
          this.firepad = Firepad.fromCodeMirror(
            this.props.firebase.ref(file.firebaseUrl()),
            editor,
            { userId: account ? account.username : '&' }
          )
        } catch (err) {
          console.warn('Error creating firepad', err)
        }
        if (this.firepad && this.firepad.on) {
          this.firepad.on('ready', () => {
            if (this.firepad.isHistoryEmpty()) {
              // Load original content of file
              file.get().then((content) => {
                console.debug('loading original:', content.original)
                // this.firepad.setText(content.original)
              })
            }
          })
        }
      } catch (err) {
        console.warn('Load firepad error:', err)
      }
    }
  }

  handleDispose = () => {
    if (this.firepad && typeof this.firepad.dispose === 'function') {
      this.firepad.dispose()
    }
  }

  enableVim = () => {
    this.editor.setOption('keyMap', 'vim')
  }

  disableVim = () => {
    this.editor.setOption('keyMap', 'default')
  }

  render () {
    return (
      <div className={classes.container} id={this.props.name} />
    )
  }
}
