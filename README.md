Knowledge Base Creator
======================

The [Everlife Avatar](https://github.com/everlifeai/everlife-node-releases/releases/)
has the ability to create multiple *Knowledge Bases* and keep them for
posterity.

These *Knowledge Bases* can contain a variety of interesting information -
the user's expertise, personal information, insights, and even secrets!

This skill allows users to create *Knowledge Bases* that they can then
use and share.

# How to Use

Start by using the `/make_kb` command to kick off the creation of the
KB. Let's start by making a new *Knowledge Base* that keeps information
about the user's hobbies:

        > /make_kb hobbies

        < Wonderful! Let's make a new Knowledge Base for the user's
          hobbies. How would you like the user to start gathering
          this information? (For eg: "Ask about me")

The first thing we need to provide is how the user will start entry into
this knowledge base. For hobbies a good phrase may be "Ask about my
hobbies".

        > Ask about my hobbies

        < Great. When the user says "Ask about my hobbies" I will open
this knowledge base and ask questions to fill in the information. What
is the first question I should ask and for what? (For eg: "name: What is
your name?")

Now we can start asking question to fill in the slots of our knowledge
base. The format is to start with the name of the slot and the question
that the user will get to fill it in. Let's start with `favhobby` -
what's the user's favorite hobby?

        > favhobby: What is your favorite hobby?

        < User says "$$". Say something back now.

Let's tell the user that his hobby is interesting before moving on. As a
chatbot we need to make sure the user has a pleasant interaction which
means putting some thought into each reply.

        > $$ is an interesting hobby. My hobby is gathering interesting
          bit patterns in the CPU - look at this one I just found
          10110110110101!

        < Saved in KB. What's the next "slot: Question?"

Keep going until you have finished asking all questions. You can end by
stopping saying "slot: Questions" and saying "Bye" or "Done" or
something.

# Feedback
For feedback, enhancements, or bug reports please [contact
us](https://everlife.ai)
