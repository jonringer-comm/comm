// @flow

import * as React from 'react';

import css from './team-profile.css';

type Props = {
  +name: string,
  +imageUrl: string,
  +githubHandle?: string,
  +twitterHandle?: string,
};

function TeamProfile(props: Props): React.Node {
  const { name, imageUrl, githubHandle, twitterHandle } = props;
  let githubLink;
  let twitterLink;

  if (githubHandle) {
    githubLink = (
      <a
        href={`https://github.com/${githubHandle}`}
        target="_blank"
        rel="noreferrer"
      >
        Github
      </a>
    );
  }

  if (twitterHandle) {
    twitterLink = (
      <a
        href={`https://twitter.com/${twitterHandle}`}
        target="_blank"
        rel="noreferrer"
      >
        Twitter
      </a>
    );
  }

  return (
    <article className={css.profile}>
      <img src={imageUrl} />
      <h4>{name}</h4>
      {githubLink}
      {twitterLink}
    </article>
  );
}

export default TeamProfile;
