var filesLocation = 'appFiles';

angular.module('hypercube.application.editor')

.service('Editor', [ '$http', '$log', '$q', 'ENV', 'Files', 'AuthService', '$rootScope', '$s3', function ($http, $log, $q, ENV, Files, AuthService, $rootScope, $s3){
	this.setAce = function(aceEditor){
		this.ace = aceEditor;
		this.ace.setTheme('ace/theme/monokai');
		this.ace.$blockScrolling = Infinity; //Disable warning message
	};
	this.setApplication = function(applicationData){
		this.application = applicationData;
		$log.log('Application data set in editor', this.application);
	};
	this.getAce = function(){
		if(this.ace){
			return this.ace;
		} else {
			$log.error('No current ace editor available.');
		}
	};
	//Get firebase array of file structure
	this.getFiles = function(){
		var d = $q.defer();
		var self = this;
		var files = Files(this.application.name);
		files.$loaded().then(function(){
			$s3.getObjects(self.application.frontend.bucketName).then(function(s3Files){
				//TODO: Compare here and add missing files to firebase
				d.resolve(files);
			});
		});
    return d.promise;
	};
	this.getStructure = function(){
		this.getFiles.then(function(){
			//TODO: Convert array from s3 into what is needed for directive
		}, function(err){

		});
		return d.promise;
	}
	this.setFileType = function(type){
		$log.log('[Editor.setFileType()] Called with type:', type);
		if(!type){
			type = 'javascript';
		}
		if(!this.ace){
			$log.error('[Editor.setFileType()] File type can not be set without ace editor instance.');
		} else {
			var setType = 'ace/mode/' + type;
			$log.log('Setting filetype:', setType);
			return this.ace.getSession().setMode(setType);
		}
	};
	this.openFile = function(file){
		$log.log('Editor.openFile()', file);
		var d = $q.defer();
		var aceOptions = {};
		//Check for already existing firepad
    if(_.has(this, 'firepad')){
      // Disconnect old firepad session
      this.firepad.dispose();
      // Empty out editor
      this.ace.getSession().setValue(null);
    }
    //Set Default Editor text
		if(file.fileType == "javascript"){
			aceOptions.defaultText = '// ' + file.name;
		} else if(file.fileType == "html"){
			if(file.name == "index.html"){
				aceOptions.defaultText = '<!DOCTYPE html>\n<html lang="en">\n\t<head>\n\n\t</head>\n\t<body>\n\n\t</body>\n</html>';
			} else {
				aceOptions.defaultText = '<!-- '+ file.name +' -->';
			}
		}
		//Add current user information
		//User info loaded from AuthService
		// AuthService.getCurrentUser().then(function (currentUser){
			// aceOptions.userId = currentUser.username;
		// });
		//User info loaded from $rootScope
		if(_.has($rootScope, 'currentUser')){
			aceOptions.userId = $rootScope.currentUser.username;
		}
		//Set firepad
  	this.firepad = Firepad.fromACE(file.$ref(), this.ace, aceOptions);
		this.setFileType(file.fileType);
  	this.currentFile = file;
  	d.resolve(file);
		return d.promise;
	};
	this.publishCurrent = function(){
		$log.log('Editor.publishFile()');
		var d = $q.defer();
		console.log('File text:',this.firepad.getText());
		if(!this.currentFile){
			d.reject({message:'A file needs to be open to publish'});
		}
		//TODO:Make key work with file path
		$http.post(ENV.serverUrl + '/apps/'+ this.application.name + '/publish', {content:this.firepad.getText(), key:this.currentFile.path, contentType:this.currentFile.contentType}).then(function (){
			$log.info('File published successfully');
			d.resolve();
		}, function (errRes){
			$log.error('Error requesting publishFile:', errRes);
			d.reject(errRes);
		});
		return d.promise;
	};
	this.publish = function(){
		$log.log('Editor.publish()');
		//TODO: Have this publish whole application structure
		var d = $q.defer();
		return d.promise;
	};
}])
//Folder Object 
.factory('Folder', ['$firebaseObject', '$firebaseArray', 'File', function ($firebaseObject, $firebaseArray, File){
	function Folder(snap){
		//Check that snap is a snapshot
		if(_.isFunction(snap.val)){ //Snap is a snapshot
			angular.extend(this, snap.val()); //Add current value from Firebase
			_.extend(this,$firebaseObject(snap.ref())); //Add firebaseObject functionality
			if(!this.children){ //Fill children parameter if folder without children
				this.children = [{}];
			} else {
				this.children = $firebaseArray(snap.ref().child('children'));
			}
		} else { //Snap is not a snapshot
			angular.extend(this, snap);
		}
		if(!this.type){
			this.type = "folder";
		}
	}
	Folder.prototype = {
	};
	return Folder;
}])
//File Object 
.factory('File', ['$firebaseObject', '$firebaseUtils', function ($firebaseObject, $firebaseUtils){
	function File(snap){
		//Check that snap is a snapshot
		if(_.isFunction(snap.val)){ //Snap is a snapshot
			angular.extend(this, snap.val()); //Add current value from Firebase
			_.extend(this, $firebaseObject(snap.ref())); //Add firebaseObject functionality
			// this.$id = snap.key();
			if(this.type == 'folder' && !this.children){ //Fill children parameter if folder without children
				this.children = ['mock child'];
			}
			this.makeKey();
		} else { //Snap is not a snapshot
			angular.extend(this, snap);
		}
		if(!this.type){
			this.type = "file";
		}
		// this.setDefaults(snap);
	}
	File.prototype = {
    setDefaults: function(snapshot) {
      var oldData = angular.extend({}, this.data);
      // add a parsed date to our widget
      // this._date = new Date(this.data.date);
			if(!this.filetype){
				this.filetype = "javascript";
			}
    },
  	getExt:function(path){
    	var re = /(?:\.([^.]+))?$/;
    	var fileName = _.last(this.path.split("/")) || path;
    	console.warn('Get ext calling with: ' + re.exec(fileName)[1]);
    	return re.exec(fileName)[1];
    },
    getTypes:function(){
    	this.contentType = extToContentType(this.getExt());
    	this.fileType = extToFileType(this.getExt());
    },
    makeKey:function(){
    	console.log('makeKey called with:', this);
    	if(_.has(this, 'name')){
    		var name = this.name;
    		return name.replace(".", ":");
    	} else if(_.has(this, 'path')){
    		var pathArray = this.path.split("/");
    		var name = _.last(pathArray);
    		this.name = name;
    		return name.replace(".", ":");
    	}
    },
    addFbObj:function(appName){
    	//TODO: Save current value into fb object
			var ref = fbutil.ref(filesLocation, appName);
			_.extend(this, $firebaseObject(ref.push()));
			var d = $q.defer();
    	this.$loaded().then(function(){
    		//Set by key within structure
	    	fileObj.$value = file;
	    	fileObj.$save().then(function(){
    			d.resolve();
    		}, function (err){
    			$log.log('Error adding files:', err);
    			d.reject(err);
    		});
    	}, function (err){
    		$log.log('Error adding files:', err);
    		d.reject(err);
    	});
  		return d.promise;
    }
	};
	return File;
	//Utility functions
	//Convert File extension to contentType
  function extToContentType(ext){
  	//Default content type
    var contentType = 'text/plain';
    //File type if statements
		if (ext=='html') {
			contentType = 'text/html'
		} else if(ext=='js') {
			contentType = 'application/javascript'
		} else if(ext=='css') {
			contentType = 'text/css'
		} else if(ext=='json') {
			contentType = 'application/json'
		} else if(ext=='jpg'||ext=='jpeg'||ext=='jpe') {
			contentType = 'image/jpeg'
		} else if(ext=='png') {
			contentType = 'image/png'
		} else if(ext=='gif') {
			contentType = 'image/gif'
		} else if(ext=='svg') {
			contentType = 'image/svg+xml'
		} else {
			contentType = 'application/octet-stream'
		}
  	console.log("Ext: " + ext + "Content Type: " + contentType);
		return contentType;
  }
  function extToFileType(ext){
  	//Default content type
  	console.log("Ext: " + ext + "File Type: " + extToContentType(ext).split("/")[1]);
  	return extToContentType(ext).split("/")[1];
  }
}])
//Files list factory the outputs extended firebaseArray
.factory("FilesFactory", ['$firebaseArray', 'File', 'Folder', '$firebaseObject', '$q', function ($firebaseArray, File, Folder, $firebaseObject, $q) {
  return $firebaseArray.$extend({
    // override the $createObject behavior to return a File object
    // $$added: function(snap) {
    // 	if(snap.val().type == 'folder' || _.has(snap.val(), 'children')){
    // 		//TODO: Make this recursive so it goes all the way down
    // 		// _.map(snap.val().children, function (child){
    // 		// 	console.log('Child map:', child);
    // 		// 	if(child.type == "file"){
    // 		// 		return new File(child.ref());
    // 		// 	}
    // 		// })
    // 		return new Folder(snap);
    // 	} else {
    //   	return new File(snap);
    // 	}
    // },
    $addFile:function(fileData){
    	//TODO: Handle path
    	//TODO: Save file within correct path
    	var file = new File({path:fileData.path});
    	file.getTypes();
    	var d = $q.defer();
    	file.addFbObj().then(function(){
    		d.resolve(file);
    	}, function (err){
    		d.reject(err);
    	});
    	return d.promise;
    },
    $addFolder:function(folderData){
    	//TODO: Handle path
    	var pathArray = folderData.path.split("/");
    	var folder = new Folder({name:_.last(pathArray), path:folderData.path});
    	var self = $firebaseObject(this.$ref());
    	var d = $q.defer();
    	self.$loaded().then(function(){
    		var key = folder.name;
    		//Check to make sure name is not taken
    		if(_.has(self, key)){
    			key += "-1";
    		}
    		//Set by key within structure
    		self[key] = folder;
    		self.$save().then(function(){
    			d.resolve(self);
    		}, function (err){
    			console.log('Error adding folder:', err);
    			d.reject(err);
    		});
    	}, function (err){
    		console.log('Error loading stucture:', err);
    		d.reject(err);
    	});
    	return d.promise;
    },
    $getStructure:function(){
    	//TODO: Create ref based on path
    	//folder/index.html
    	var d = $q.defer();
    	var self = this;
    	self.$loaded().then(function(structureArray){
    		var finalArray = [];
    		console.info('structureArray loaded:', structureArray);
    		structureArray.forEach(function buildIntoTree(file){
					var pathArray = file.path.split("/");
					console.log('pathArray:', pathArray);
					var currentObj = {path:file.path};
					if(pathArray.length == 1){
						currentObj.name = pathArray[0];
						currentObj.type = "file";
						finalArray.push(currentObj);
					}
					if(pathArray.length >= 2) {
						_.each(pathArray, function (loc, ind, list){
							currentObj.name = loc;
							if(ind != pathArray.length - 1){ //Not the last loc
								currentObj.type = "folder";
								if(currentObj.children){
									currentObj['children']['children'] = [currentObj];
								} else {
									currentObj.children = [currentObj];
									currentObj = currentObj.children[0]
								}
							} else {
								currentObj.type = "file";
								finalArray.push(currentObj);
							}
						});
					}
    		});
    		d.resolve(finalArray);
    	});
    	return d.promise;
	  }
	});
}])
.factory('Files', ['fbutil', 'FilesFactory', function (fbutil, FilesFactory) {
	return function (appName){
		var ref = fbutil.ref(filesLocation, appName);
  	return FilesFactory(ref);
	}
}]);
