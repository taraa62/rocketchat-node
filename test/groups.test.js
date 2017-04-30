/**
 * Created by qeesung on 2017/4/29.
 */

const RocketChatClient = require("../lib/rocketChat").RocketChatClient;
const should = require("should");
const co = require("co");

const config = {
    host: "127.0.0.1",
    port: "3000",
    user: "qeesung",
    password: "123456"
};

let userToAdd = {
    "name": "test-group-user",
    "email": "email@example.com",
    "password": "anypassyouwant",
    "username": "uniqueusername-group",
    "sendWelcomeEmail": false,
    "joinDefaultChannels": false,
    "verified": false,
    "requirePasswordChange": false,
    "roles": ["user"]
};

describe("groups", () => {
    let rocketChatClient = null;
    before( (done) => {
        rocketChatClient = new RocketChatClient("http",
            config.host,
            config.port,
            config.user,
            config.password,
            done);
    });

    describe("create group and remove group", () => {
        it("create result should be success and should have group id property", () => {
            return co(function *() {
                let createdGroup = yield rocketChatClient.groups.create("test-group-"+Date.now());
                createdGroup.success.should.equal(true);
                createdGroup.group._id.should.be.ok();
            });
        });

        it("close result success result should be success", () => {
            return co(function *() {
                let createdGroup = yield rocketChatClient.groups.create("test-group-"+Date.now());
                createdGroup.success.should.equal(true);
                createdGroup.group._id.should.be.ok();

                let createdGroupId = createdGroup.group._id;

                let closeResult = yield rocketChatClient.groups.close(createdGroupId);
                closeResult.success.should.equal(true);
            });
        });
    });

    describe("add user to the group", () => {
        let createdUserId = null;
        let createGroupId = null;

        beforeEach(() => {
            userToAdd.name = userToAdd.name + Date.now();
            userToAdd.username = userToAdd.username + Date.now();
            userToAdd.email = "email" + Date.now() + "@example.com";
            return co(function *() {
                let createdUser = yield rocketChatClient.users.create(userToAdd);
                createdUserId = createdUser.user._id;

                let createdGroup = yield rocketChatClient.groups.create("test-group-"+Date.now());
                createGroupId = createdGroup.group._id;
            });
        });

        afterEach(() => {
            return co(function *() {
                if(createdUserId != null)
                    yield rocketChatClient.users.delete(createdUserId);
                if(createGroupId != null)
                    yield rocketChatClient.groups.archive(createGroupId);
                createGroupId = null;
                createdUserId = null;
            });
        });

        // addAll only provide in 0.55 version
        // but now rocket chat docker image version is 0.54
        xit("Adds all of the users of the Rocket.Chat server to the group. " +
            "result should be success, and username list should contain the created user", () => {
            return co(function *() {
                let addAllResult = yield rocketChatClient.groups.addAll(createGroupId);
                addAllResult.success.should.equal(true);
                addAllResult.group.usernames.should.matchAny(new RegExp(`^${userToAdd.username}.*`));
            });
        });

        it("Gives the role of owner for a user in the current group. result should be success", () => {
            return co(function *() {
                // invite user
                let inviteResult = yield rocketChatClient.groups.invite(createGroupId, createdUserId);
                inviteResult.success.should.equal(true);

                // add the user as owner
                let addOwnerResult = yield rocketChatClient.groups.addOwner(createGroupId, createdUserId);
                addOwnerResult.success.should.equal(true);
            });
        });

        it("Gives the role of moderator for a user in the currrent group. result should be success", () => {
            return co(function *() {
                // invite user
                let inviteResult = yield rocketChatClient.groups.invite(createGroupId, createdUserId);
                inviteResult.success.should.equal(true);

                // add the user as owner
                let addModeratorResult = yield rocketChatClient.groups.addModerator(createGroupId, createdUserId);
                should(addModeratorResult.success).be.ok();
            });
        });

        it("Adds a user to the private group. " +
            "result should be success and invited user should in the username list", () => {
            return co(function *() {
                let inviteResult = yield rocketChatClient.groups.invite(createGroupId, createdUserId);
                inviteResult.success.should.equal(true);

                inviteResult.group.usernames.should.matchAny(new RegExp(`^${userToAdd.username}`));
            });
        });

        it("Removes a user from the private group. " +
            "result should be success and kicked user should not in username list", () => {
            return co(function *() {
                // invite user
                let inviteResult = yield rocketChatClient.groups.invite(createGroupId, createdUserId);
                inviteResult.success.should.equal(true);

                // kick the user
                let kickedResult = yield rocketChatClient.groups.kick(createGroupId, createdUserId);
                kickedResult.success.should.equal(true);
                //kickedResult.group.usernames.should.not.matchAny(new RegExp(`^${userToAdd.username}`));
            });
        });

        it("Causes the callee to be removed from the private group, qeesung should not in the username list", () => {
            return co(function *() {
                // invite new user to the group
                let invitedResult = yield rocketChatClient.groups.invite(createGroupId, createdUserId);
                invitedResult.success.should.equal(true);

                // set the new user as owner
                let setOwnerResult = yield rocketChatClient.groups.addOwner(createGroupId, createdUserId);
                setOwnerResult.success.should.equal(true);

                // leave the room
                let leaveResult = yield rocketChatClient.groups.leave(createGroupId);
                leaveResult.success.should.equal(true);
                //leaveResult.group.usernames.should.not.matchAny(/^qeesung/);

                createdUserId = null;
                createGroupId = null;
            });
        });

        it("Lists all of the private groups the calling user has joined, " +
            "result should be success and groups size should greater than 0", () => {
            return co(function *() {
                let groupList = yield rocketChatClient.groups.list();
                groupList.success.should.equal(true);

                (groupList.groups.length > 0).should.equal(true);
            });
        });
    });

    describe("config the get groups' properties", () => {
        let createGroupId = null;

        beforeEach(() => {
            return co(function *() {
                let createdGroup = yield rocketChatClient.groups.create("test-group-"+Date.now());
                createGroupId = createdGroup.group._id;
            });
        });

        afterEach(() => {
            return co(function *() {
                if(createGroupId != null)
                    yield rocketChatClient.groups.archive(createGroupId);
                createGroupId = null;
            });
        });

        it("Archives a private group, only if you’re part of the group. result should be success", () => {
            return co(function *() {
                let archiveResult = yield rocketChatClient.groups.archive(createGroupId);
                archiveResult.success.should.equal(true);

                createGroupId = null;
            });
        });

        it("Retrieves the integrations which the group has, " +
            "result should be success, and should contain integrations array property", () => {
            return co(function *() {
                let integrationsResult = yield rocketChatClient.groups.getIntegrations(createGroupId);
                integrationsResult.success.should.equal(true);
                integrationsResult.integrations.should.be.Array();
            });
        });

        it("Retrieves the messages from a private group, the last message should be 'hello world'", () => {
            return co(function *() {
                let textMessage = "hello world at "+Date.now();
                // send message
                let postMessageResult = yield rocketChatClient.chat.postMessage({roomId: createGroupId, text: textMessage});
                postMessageResult.success.should.equal(true);

                // get the messages from channel
                let history = yield rocketChatClient.groups.history({roomId: createGroupId});
                history.messages.should.matchEach((value) => {
                    value.msg.should.match(new RegExp(`^${textMessage}`));
                });
            });
        });

        it("Retrieves the information about the private group, " +
            "result should be success and group property should be exist", () => {
            return co(function *() {
                let infoResult = yield rocketChatClient.groups.info(createGroupId);
                infoResult.success.should.equal(true);
                infoResult.group.should.be.ok();
            });
        });
    });
});
