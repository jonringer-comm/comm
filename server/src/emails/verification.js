// @flow

import React from 'react'
import ReactHTML from 'react-html-email';

import { verifyField } from 'lib/types/verify-types';

import urlFacts from '../../facts/url';
import { createVerificationCode } from '../models/verification';
import sendmail from './sendmail';
import Template from './template.react';

const { Span, A, renderEmail } = ReactHTML;
const { baseDomain, basePath } = urlFacts;

async function sendEmailAddressVerificationEmail(
  userID: string,
  username: string,
  emailAddress: string,
  welcome: bool = false,
): Promise<void> {
  const code = await createVerificationCode(userID, verifyField.EMAIL);
  const link = baseDomain + basePath + `verify/${code}/`;

  let welcomeText = null;
  let action = "verify your email";
  if (welcome) {
    welcomeText = (
      <Span fontSize={24}>
        {`Welcome to SquadCal, ${username}!`}
      </Span>
    );
    action = `complete your registration and ${action}`;
  }

  const title = "Verify email for SquadCal";
  const email = (
    <Template title={title}>
      {welcomeText}
      <Span>
        {`Please ${action} by clicking this link: `}
        <A href={link}>{link}</A>
      </Span>
    </Template>
  );
  const html = renderEmail(email);

  sendmail.sendMail({
    from: "no-reply@squadcal.org",
    to: emailAddress,
    subject: title,
    html,
  });
}

export {
  sendEmailAddressVerificationEmail,
};
