var express = require('express');
var router = express.Router();
var model = require('../models/admin');
var model_data = require('../models/data');
var model_user = require('../models/users');

/* GET Admin page. */
/*
 router.get('/', ensureAuthenticated, function (req, res, next) {
 if (req.user.Admin[0]) {
 var user = req.user;
 var admin = req.user.Admin[0];//TODO: Need to add ability to switch between organizations if more than one result
 var orgID = admin.ORGANIZATIONID;

 //console.log("OBJECt-OrgID: " + orgID);
 model.getGroups(orgID, function (err, groups) {
 //   console.log("Results: " + JSON.stringify(groups, null, 2));


 res.render('admin/dash', {
 title: 'Admin Dashboard',
 name: user.name.givenName + " " + user.name.familyName,
 id: user.id,
 isAdmin: user.isAdmin,
 organizationid: admin.ORGANIZATIONID,
 groups: groups
 })
 });
 }
 else {
 res.send('404: Page not Found', 404);
 }
 });
 */

/* GET Dynamic Admin page. */
router.get('/:orgID', ensureAuthenticated, function (req, res, next) {

    var user = req.user;

    model_user.getPermissions(req.user, req.params.orgID, function (access) {
        if (access == null) {
            console.log("RESULT WAS == to {}");
            res.redirect('/');
            return;
        }

        model.getGroups(access.ORGANIZATIONID, function (err, groups) {

            console.log("ADMIN: " + JSON.stringify(access, null, 2));
            res.render('admin/dash', {
                title: access.ORG_NAME + ' Dashboard',
                name: user.name.givenName + " " + user.name.familyName,
                id: user.id,
                isAdmin: user.isAdmin,
                access: access,
                groups: groups
            })
        });
    });

});

router.get('/:orgID/create/group', ensureAuthenticated, function (req, res, next) {

    model_user.getPermissions(req.user, req.params.orgID, function (access) {
        if (result == {}) {
            console.log("RESULT WAS == to {}");
            res.redirect('/');
            return;
        }

        var user = req.user;
        res.render('admin/create-group', {
            title: 'Create New Group',
            name: user.name.givenName + " " + user.name.familyName,
            id: user.id,
            isAdmin: user.isAdmin,
            access: access
        })
    });
});

router.post('/:orgID/create/group', ensureAuthenticated, function (req, res, next) {

    model_user.getPermissions(req.user, req.params.orgID, function (access) {
        if (result == {}) {
            console.log("RESULT WAS == to {}");
            res.redirect('/');
            return;
        }
        var name = req.body.group_name;
        var orgID = access.ORGANIZATIONID;

        model.createGroup(name, orgID, function (err, data) {
            res.redirect('/admin/' + orgID);
        });
    });
});


/**
 * Remove group
 */
router.get('/:orgID/remove/:type/:id', ensureAuthenticated, function (req, res, next) {

    model_user.getPermissions(req.user, req.params.orgID, function (access) {
        if (Object.keys(access).length == 0) {
            res.redirect('/');
            return;
        }
        switch (req.params.type) {
            case 'group':
                model.deleteGroup(req.params.id, function (err) {
                    res.redirect('/admin/' + access.ORGANIZATIONID);
                });

                break;
            case 'admin':
                model.removeAdmin(req.params.id, access, function(err){
                    res.redirect('/admin/' + access.ORGANIZATIONID + "/administrators");
                })
                break;
            default:
                break;
        }

    });
});

router.get('/:orgID/administrators', ensureAuthenticated, function (req, res, next) {

    model_user.getPermissions(req.user, req.params.orgID, function (access) {
        if (Object.keys(access).length == 0) {
            res.redirect('/');
            return;
        }
        model.getAdmins(req, access, function (adminList) {

            console.log("ADMIN: " + JSON.stringify(adminList, null, 2));
            console.log("ADMINLIST: " + Object.keys(adminList));
            var user = req.user;
            res.render('admin/administrators', {
                title: 'Administrators',
                name: user.name.givenName + " " + user.name.familyName,
                id: user.id,
                access: access,
                adminList: adminList
            })
        });
    });
});

router.get('/:orgID/generate/invite', ensureAuthenticated, function (req, res, next) {

    model.generateInvite(req, function (result) {
        if(result){
            res.send(result);
        }
        else{
            res.sendStatus("404");
        }
    });
});

router.get('/:orgID/invite/:code', ensureAuthenticated, function (req, res, next) {

        model.inviteAdmin(req, function (result) {
            if(result){
            res.redirect("/admin/" + req.params.orgID);
            }
            else{
                res.status(404).send('Sorry, The code has expired. You will have to request it is resent.');
            }
    });
});






/**
 * TODO
 * 1. Should there be a single results page or is it easier to manage a separate admin version?
 */
router.get('/results', ensureAuthenticated, function (req, res, next) {

    if (req.user.Admin[0]) {
        model_data.getUserTaskList(req, function (results) {

            res.render('results', {
                title: 'Results',
                name: req.user.name.givenName + " " + req.user.name.familyName,
                id: req.user.id,
                isAdmin: req.user.isAdmin,
                taskList: results
            })
        });
    }
    else {
        res.send('404: Page not Found', 404);
    }
});


/**
 * TODO: Need results first
 */
router.post('/results/data', ensureAuthenticated, function (req, res, next) {
    if (req.user.Admin[0]) {
        model_data.getUserTaskData(req, function (data) {

            console.log("RESULTS_AJAX: " + JSON.stringify(data, null, 2));
            res.send({
                data: data
            })
        });


    }
    else {
        res.send('404: Page not Found', 404);
    }
});

//route functions
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated())
        return next();
    else
        res.redirect('/');
}

module.exports = router;
