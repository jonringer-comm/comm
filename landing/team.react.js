// @flow

import * as React from 'react';

import TeamProfile from './team-profile.react.js';

function Team(): React.Node {
  return (
    <div>
      <h2>Team</h2>
      <section>
        <TeamProfile
          name="Ashoat Tevosyan"
          githubHandle="ashoat"
          twitterHandle="ashoat"
          imageUrl="https://avatars.githubusercontent.com/u/863579?v=4"
        />
        <TeamProfile
          name="Atul Madhugiri"
          githubHandle="atulsmadhugiri"
          twitterHandle="atuli0"
          imageUrl="https://avatars.githubusercontent.com/u/32692685?v=4"
        />
        <TeamProfile
          name="Benjamin Schachter"
          githubHandle="benschac"
          twitterHandle="benschac"
          imageUrl="https://avatars.githubusercontent.com/u/2502947?v=4"
        />
      </section>
      <h2>Software Mansion Team</h2>
      <h2>Investors</h2>
    </div>
  );
}

export default Team;
