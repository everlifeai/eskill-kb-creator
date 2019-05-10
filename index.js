'use strict'
const cote = require('cote')({statusLogsEnabled:false})
const u = require('elife-utils')

/*      understand/
 * This is the main entry point where we start.
 *
 *      outcome/
 * Start our microservice and register with other services
 */
function main() {
    startMicroservice()
    registerWithCommMgr()
}

let msKey = 'eskill-kb-creator'

const commMgrClient = new cote.Requester({
    name: `${msKey} -> CommMgr`,
    key: `everlife-communication-svc`,
})

function sendReply(msg, req) {
    req.type = 'reply'
    req.msg = msg
    commMgrClient.send(req, (err) => {
        if(err) u.showErr(err)
    })
}

/*      outcome/
 * Register ourselves as a message handler with the communication
 * manager.
 */
function registerWithCommMgr() {
    commMgrClient.send({
        type: 'register-msg-handler',
        mskey: msKey,
        mstype: 'msg',
        mshelp: [
            { cmd: '/make_kb', txt: 'make a new KB' },
        ],
    }, (err) => {
        if(err) u.showErr(err)
    })
}

function startMicroservice() {

    /*      understand/
     * The microservice (partitioned by key to prevent conflicting with
     * other services).
     */
    const svc = new cote.Responder({
        name: 'Everlife Tutorial Service',
        key: msKey,
    })

    svc.on('msg', (req, cb) => {
        let replies = get_replies_1(req.msg)
        if(!replies) return cb()
        else {
            cb(null, true)
            if(typeof replies == 'function') replies(req)
            else replyFrom(replies, req)
        }
    })

    /*      understand/
     * In order for a response to make sense, it often has to be in the
     * 'context' of a conversation. That context is stored here.
     */
    let CONV_CTX = { ctx: null }

    /*      problem/
     * We want to carry out a conversation with a 'flow' with the user.
     *
     *      way/
     * We keep a set of 'mini-responders' each of whom understands a
     * certain user input in a given context.
     *
     * TODO: Make context persistable? Would this involve having
     * communication manager being persistable also?
     */
    function get_replies_1(msg) {
        if(!msg) return
        msg = msg.trim()
        if(!msg) return

        let mini_responders = [
            resp_start,
            resp_enter,
            resp_1stq,
            resp_nxt,
            resp_nxtq,
        ]

        for(let i = 0;i < mini_responders.length;i++) {
            let r = mini_responders[i](msg, CONV_CTX)
            if(r) return r
        }
    }
}

/*      outcome/
 * Return a function that sends a set of messages, one after another as
 * a nice chatty sequence.
 */
function sendReplies(replies) {

    return function(req) {
        send_replies_1(0)

        function send_replies_1(ndx) {
            if(ndx >= replies.length) return
            if(replies[ndx]) sendReply(replies[ndx], req)
            setTimeout(() => {
                send_replies_1(ndx+1)
            }, 3500)
        }
    }
}


/*      outcome/
 * To give the feeling of a real(ish) conversation we don't
 * mechanically reply the same everytime. Instead, if given a set of
 * options, we randomly pick one to reply.
 */
function replyFrom(replies, req) {
    if(!Array.isArray(replies)) sendReply(replies, req)
    else {
        let ndx = Math.floor(Math.random()*replies.length)
        sendReply(replies[ndx], req)
    }
}


function resp_start(msg, ctx) {
    if(!msg.startsWith('/make_kb') || ctx.ctx) return
    let name = msg.substring('/make_kb '.length).trim()
    if(!name) return [
        `Please use '/make_kb <name of knowledge base>'`,
        `You forgot to specify the name of the knowledge base`,
        `Use '/make_kb <name of knowledge base>'`,
    ]
    ctx.ctx = 'kb-started'
    ctx.kb = { name: name }
    return sendReplies([
        `Alright Great! Let's create a new Knowledge Base for someone's ${name}`,
        `As a Knowledge Base (KB) creator you will control EVERYTHING I say while the KB is being populated`,
        `Thrilling isn't it? :-)`,
        `To start with, what should the person say to begin your KB? (For example - if your KB was about personal info you'd start when the person says: "Ask about me")`,

    ])
}

function resp_enter(msg, ctx) {
    if(ctx.ctx != 'kb-started') return
    ctx.ctx = '1stq'
    ctx.kb.startPhrase = msg
    return sendReplies([
        `Great. When the user says "${ctx.kb.startPhrase}" I will open this knowledge base and ask questions to fill in the information`,
        `Now, because you control everything I say during this time, you should keep two things in mind`,
        `First, when getting the user to fill in some details it's usually nice to ask a question. For example, if you wanted to get the user's name you should not just say "Name:". Instead give me a question to ask like this`,
        `name: What is your name?`,
        ``,
        `Second, after the user answers with something, it is usually a good idea to say something back to continue the conversation`,
        `For example, if the user says 'My name is "Jack"', you could respond with 'Nice to meet you Jack!' before going on to the next question`,
        `Phew! Just re-read that if you need to before starting`,
        `Let's start with your first question now (something like "name: What is your name?")`,
    ])
}

function resp_1stq(msg, ctx) {
    if(ctx.ctx != '1stq') return
    ctx.ctx = 'nxtq'
    ctx.kb.data = []
    return resp_nxtq(msg, ctx)
}

function resp_nxt(msg, ctx) {
    if(ctx.ctx != 'usr-nxt') return

    if(isBye(msg)) return okDone(ctx)

    ctx.ctx = 'nxtq'
    ctx.slot.resp = msg.replace(ctx.user_reply, () => '$$')
    ctx.kb.data.push(ctx.slot)
    ctx.slot = null
    return `Added to KB. What's the next "info: Question?"`
}

function resp_nxtq(msg, ctx) {
    if(ctx.ctx != 'nxtq') return

    if(isBye(msg)) return okDone(ctx)

    let s = msg.indexOf(':')
    if(s < 1) return [
        `To add a question to the Knowledge Base you have to tell me the question and where to save the answer. You must say something like 'location: Where do you live?'`,
        `Please specify the Knowledge Base info you want and the question that fills in the info separated by a ':'. For example 'age: How old are you?'`,
    ]

    let slot = msg.substring(0, s).trim()
    let q = msg.substring(s+1).trim()

    ctx.ctx = 'usr-nxt'
    ctx.slot = { slot: slot, q: q }
    ctx.user_reply = get_random_user_reply_1()
    return `User says "${ctx.user_reply}". Say something back to him`


    /*      problem/
     * When creating a Knowledge base, we would like to reply to the
     * user using their own words:
     *      user: I am Charles
     *      us: Nice to meet you Charles!
     *
     *      way/
     * We don't know what the user will say, of course, so we just reply
     * with some random phrase that the KB developer will have to
     * imagine is the user's reply.
     */
    function get_random_user_reply_1() {
        let replies = [
            "crocodile_dundee",
            "fast_flash",
            "big_splash",
            "big_blue",
            "whale_fat",
            "laugh_python",
            "sing_parrot",
        ]

        let ndx = Math.floor(Math.random()*replies.length)
        return replies[ndx]
    }
}

function isBye(msg) {
    msg = msg.toLowerCase()
    let byes = [
        "bye",
        "done",
        "goodbye",
        "finish",
        "finished",
        "ok done",
        "fin",
        "close",
        "stop",
        "save",
    ]
    for(let i = 0;i < byes.length;i++) {
        if(byes[i] == msg) return true
    }
    return false
}

function okDone(ctx) {
    let name = ctx.kb.name
    saveKB(ctx.kb)
    ctx.ctx = null
    ctx.kb = null
    return [
        `Ok bye!`,
        `Bye`,
        `Done creating ${name}. You can create a new KB using '/make_kb'`,
        `Saved ${name}. You can create a new KB using '/make_kb'`,
        `Saved ${name}`,
    ]
}

const aimlBrainClient = new cote.Requester({
    name: `${msKey} -> AIML Brain`,
    key: `ebrain-aiml`,
})

function saveKB(kb) {
    aimlBrainClient.send({
        type: 'save-kb-tpl',
        kb: kb,
    }, (err) => {
        if(err) u.showErr(err)
    })
}

main()
