import "./service-details.scss"

import React from "react";
import { observer } from "mobx-react";
import { t, Trans } from "@lingui/macro";
import { DrawerItem, DrawerTitle } from "../drawer";
import { Badge } from "../badge";
import { KubeEventDetails } from "../+events/kube-event-details";
import { KubeObjectDetailsProps } from "../kube-object";
import { Service, serviceApi } from "../../api/endpoints";
import { _i18n } from "../../i18n";
import { apiManager } from "../../api/api-manager";
import { KubeObjectMeta } from "../kube-object/kube-object-meta";
import { apiBase } from "../../api"
import { Link } from "react-router-dom";

interface Props extends KubeObjectDetailsProps<Service> {
}

@observer
export class ServiceDetails extends React.Component<Props> {
  async portForward(event: React.MouseEvent, port: string) {
    event.preventDefault();
    const { object: service } = this.props
    const targetPort = port.split(":")[0]

    apiBase.post(`/services/${service.getNs()}/${service.getName()}/port-forward/${targetPort}`, {});
  }

  render() {
    const { object: service } = this.props;
    if (!service) return;
    const { spec } = service;
    const portBadges = service.getPorts().map((port) => {
      return([
        <li><Link to="" title="Open in a browser" onClick={(e) => this.portForward(e, port) }>{port}</Link></li>
      ])
    })
    return (
      <div className="ServicesDetails">
        <KubeObjectMeta object={service}/>

        <DrawerItem name={<Trans>Selector</Trans>} labelsOnly>
          {service.getSelector().map(selector => <Badge key={selector} label={selector}/>)}
        </DrawerItem>

        <DrawerItem name={<Trans>Type</Trans>}>
          {spec.type}
        </DrawerItem>

        <DrawerItem name={<Trans>Session Affinity</Trans>}>
          {spec.sessionAffinity}
        </DrawerItem>

        <DrawerTitle title={_i18n._(t`Connection`)}/>

        <DrawerItem name={<Trans>Cluster IP</Trans>}>
          {spec.clusterIP}
        </DrawerItem>

        {service.getExternalIps().length > 0 && (
          <DrawerItem name={<Trans>External IPs</Trans>}>
            {service.getExternalIps().map(ip => <div key={ip}>{ip}</div>)}
          </DrawerItem>
        )}

        <DrawerItem name={<Trans>Ports</Trans>}>
          <ul className="portList">
            {portBadges}
          </ul>
        </DrawerItem>

        {spec.type === "LoadBalancer" && spec.loadBalancerIP && (
          <DrawerItem name={<Trans>Load Balancer IP</Trans>}>
            {spec.loadBalancerIP}
          </DrawerItem>
        )}

        <KubeEventDetails object={service}/>
      </div>
    );
  }
}

apiManager.registerViews(serviceApi, {
  Details: ServiceDetails,
})
