import {KeyCertPair, Server, ServerCredentials} from '@grpc/grpc-js';
import {bgCyan, green, yellow} from 'colors/safe';
import {Service} from 'protobufjs';

import {mockServiceMethods} from './automock';
import {fromFileName, walkServices} from './protobuf';

interface SecureCredentials {
  rootCerts: Buffer | null;
  keyCertPairs: KeyCertPair[];
  checkClientCertificate?: boolean;
}

/**
 * Start a mock GRPC Server
 */
export async function startGRPCServer(protoPath: string, serverPort: string, secureCredentials?: SecureCredentials, includeDirs?: string[]) {
  const server = new Server({});

  const proto = await fromFileName(protoPath, includeDirs || []);

  let services = 0;
  walkServices(proto, (service, def) => {
    bindServiceToServer(service, server, def);
    services++;
  });

  if (services === 0) {
    console.log(yellow('No Services found in your proto file'));
    return;
  }

  let credentials = ServerCredentials.createInsecure();

  if (secureCredentials) {
    credentials = ServerCredentials.createSsl(
      secureCredentials.rootCerts,
      secureCredentials.keyCertPairs,
      secureCredentials.checkClientCertificate,
    );
  }

  server.bind(`0.0.0.0:${serverPort}`, credentials);
  server.start();

  console.log(bgCyan(`\nGRPC Server listening on port ${serverPort}!`));
}

function bindServiceToServer(service: Service, server: Server, def: any) {
  console.log(yellow(`[Service] ${service.fullName} detected:`));

  const serviceImpl = mockServiceMethods(service);

  Object.keys(serviceImpl).forEach(method =>
    console.log(green(`    [Method] ${method} registered`))
  );

  server.addService(def.service, serviceImpl);
}
